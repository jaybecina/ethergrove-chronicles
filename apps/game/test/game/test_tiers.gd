extends CoreTest
## Tiers table and RenderApplier: the approved F3 values, monotone cost, GPU detection and what `apply` really sets.

const NUMERIC_KEYS: Array[String] = [
	"msaa", "scale", "shadow_size", "splits", "soft", "grass", "scatter", "particles", "lights",
]
## fxaa (a cheap substitute for MSAA) and blob_shadow (a cheap substitute for real shadows) are inverse.
const BOOL_KEYS: Array[String] = ["shadows", "glow", "ssao", "ssil", "dof", "vfog", "light_shadows"]

var _vp: SubViewport = null
var _env: Environment = null
var _sun: DirectionalLight3D = null


func before_each() -> void:
	_vp = SubViewport.new()
	add_child_autofree(_vp)
	_env = Environment.new()
	_sun = DirectionalLight3D.new()
	_vp.add_child(_sun)


func _f(v: Variant) -> float:
	var out: float = v
	return out


func _i(v: Variant) -> int:
	var b: bool = v
	return 1 if b else 0


func _row(id: String) -> Dictionary:
	return d(Tiers.TABLE[id])


func test_table_has_three_tiers_with_identical_key_sets() -> void:
	var ids: Array[String] = ["low", "medium", "high"]
	eq(Tiers.IDS, ids)
	eq(Tiers.TABLE.size(), 3)
	var keys: Array = _row("low").keys()
	keys.sort()
	for id: String in Tiers.IDS:
		var k: Array = _row(id).keys()
		k.sort()
		eq(k, keys, id)


func test_low_draws_no_more_than_medium_than_high() -> void:
	var order: Array[String] = ["low", "medium", "high"]
	for i: int in range(order.size() - 1):
		var lo: Dictionary = _row(order[i])
		var hi: Dictionary = _row(order[i + 1])
		for key: String in NUMERIC_KEYS:
			var l: float = _f(lo[key])
			var h: float = _f(hi[key])
			assert_true(l <= h, "%s %s <= %s" % [key, order[i], order[i + 1]])
		for key: String in BOOL_KEYS:
			assert_true(_i(lo[key]) <= _i(hi[key]), "%s %s <= %s" % [key, order[i], order[i + 1]])
		for key: String in ["fxaa", "blob_shadow"]:
			assert_true(_i(lo[key]) >= _i(hi[key]), "%s is inverse" % key)


func test_values_match_f3() -> void:
	var low: Dictionary = _row("low")
	eq(low["msaa"], Viewport.MSAA_DISABLED)
	eq(low["fxaa"], true)
	eq(low["scale"], 0.75)
	eq(low["shadows"], false)
	eq(low["shadow_size"], 1024)
	eq(low["splits"], DirectionalLight3D.SHADOW_ORTHOGONAL)
	eq(low["soft"], RenderingServer.SHADOW_QUALITY_HARD)
	eq(low["lights"], 2)
	eq(low["blob_shadow"], true)
	var med: Dictionary = _row("medium")
	eq(med["msaa"], Viewport.MSAA_2X)
	eq(med["fxaa"], false)
	eq(med["scale"], 1.0)
	eq(med["shadows"], true)
	eq(med["shadow_size"], 2048)
	eq(med["splits"], DirectionalLight3D.SHADOW_PARALLEL_2_SPLITS)
	eq(med["soft"], RenderingServer.SHADOW_QUALITY_SOFT_LOW)
	eq([med["glow"], med["ssao"], med["ssil"], med["dof"], med["vfog"]], [true, true, false, false, false])
	eq(med["lights"], 4)
	eq(med["light_shadows"], false)
	eq(med["blob_shadow"], false)
	var high: Dictionary = _row("high")
	eq(high["msaa"], Viewport.MSAA_4X)
	eq(high["shadow_size"], 4096)
	eq(high["splits"], DirectionalLight3D.SHADOW_PARALLEL_4_SPLITS)
	eq(high["soft"], RenderingServer.SHADOW_QUALITY_SOFT_HIGH)
	eq([high["glow"], high["ssao"], high["ssil"], high["dof"], high["vfog"]], [true, true, true, true, true])
	eq([high["grass"], high["scatter"], high["particles"]], [1.3, 1.5, 1.4])
	eq(high["lights"], 8)
	eq(high["light_shadows"], true)
	eq(high["blob_shadow"], false)
	for id: String in ["low", "medium"]:
		var r: Dictionary = _row(id)
		eq([r["grass"], r["scatter"], r["particles"]], [1.0, 1.0, 1.0], id)


func test_is_weak_gpu() -> void:
	for name: String in ["llvmpipe", "SwiftShader", "Intel(R) UHD Graphics 630", "Mali-G52"]:
		assert_true(Tiers.is_weak_gpu(name), name)
	for name: String in ["Apple M4", "NVIDIA GeForce RTX 4060", "Intel(R) Iris(R) Xe Graphics"]:
		assert_false(Tiers.is_weak_gpu(name), name)


func test_auto_tier_weak_gpu() -> void:
	eq(Tiers.resolve("auto", "llvmpipe"), "low")
	eq(Tiers.pick_initial("Mali-G52"), "low")


func test_auto_never_high() -> void:
	for name: String in ["Apple M4", "NVIDIA GeForce RTX 4060", "", "llvmpipe"]:
		assert_ne(Tiers.pick_initial(name), "high", name)
		assert_ne(Tiers.resolve("auto", name), "high", name)
	eq(Tiers.pick_initial("Apple M4"), "medium")


func test_resolve_explicit_and_unknown_falls_back() -> void:
	eq(Tiers.resolve("high", "llvmpipe"), "high")
	eq(Tiers.resolve("low", "Apple M4"), "low")
	eq(Tiers.resolve("ultra", "Apple M4"), "medium")
	eq(Tiers.resolve("ultra", "llvmpipe"), "low")


func test_apply_tier_is_idempotent() -> void:
	for id: String in Tiers.IDS:
		RenderApplier.apply(id, _vp, _env, _sun)
		var first: Dictionary = RenderApplier.summarize(_vp, _env, _sun)
		RenderApplier.apply(id, _vp, _env, _sun)
		eq(RenderApplier.summarize(_vp, _env, _sun), first, id)


func test_apply_sets_msaa_and_scale() -> void:
	for id: String in Tiers.IDS:
		var row: Dictionary = _row(id)
		RenderApplier.apply(id, _vp, _env, _sun)
		eq(_vp.msaa_3d, row["msaa"], id)
		var fxaa: bool = row["fxaa"]
		var aa: int = Viewport.SCREEN_SPACE_AA_FXAA if fxaa else Viewport.SCREEN_SPACE_AA_DISABLED
		eq(_vp.screen_space_aa, aa, id)
		var scale: float = row["scale"]
		var mode: int = Viewport.SCALING_3D_MODE_FSR if scale < 1.0 else Viewport.SCALING_3D_MODE_BILINEAR
		eq(_vp.scaling_3d_mode, mode, id)
		eq(_vp.scaling_3d_scale, row["scale"], id)


func test_apply_sets_sun_and_environment() -> void:
	for id: String in Tiers.IDS:
		var row: Dictionary = _row(id)
		RenderApplier.apply(id, _vp, _env, _sun)
		eq(_sun.shadow_enabled, row["shadows"], id)
		eq(_sun.directional_shadow_mode, row["splits"], id)
		eq(_env.glow_enabled, row["glow"], id)
		eq(_env.ssao_enabled, row["ssao"], id)
		eq(_env.ssil_enabled, row["ssil"], id)
		eq(_env.volumetric_fog_enabled, row["vfog"], id)
		var s: Dictionary = RenderApplier.summarize(_vp, _env, _sun)
		eq(s["tier"], id)
		eq(s["dof"], row["dof"], id)
		eq(s["shadow_size"], row["shadow_size"], id)


func test_apply_sets_dof_on_camera_attributes() -> void:
	var cam: Camera3D = Camera3D.new()
	cam.attributes = CameraAttributesPractical.new()
	_vp.add_child(cam)
	cam.make_current()
	RenderApplier.apply("high", _vp, _env, _sun)
	var attrs: CameraAttributesPractical = cam.attributes as CameraAttributesPractical
	assert_true(attrs.dof_blur_far_enabled)
	RenderApplier.apply("medium", _vp, _env, _sun)
	assert_false(attrs.dof_blur_far_enabled)


func test_apply_unknown_tier_pushes_error_and_changes_nothing() -> void:
	RenderApplier.apply("medium", _vp, _env, _sun)
	var before: Dictionary = RenderApplier.summarize(_vp, _env, _sun)
	RenderApplier.apply("ultra", _vp, _env, _sun)
	assert_push_error("unknown tier")
	eq(RenderApplier.summarize(_vp, _env, _sun), before)

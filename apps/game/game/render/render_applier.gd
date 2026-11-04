class_name RenderApplier
extends RefCounted
## Applies a graphics tier to a viewport, its environment and the sun. Idempotent. The shadow atlas size and soft
## shadow quality are global RenderingServer settings; they are set and never restored.

const DOF_META := "tier_dof"
const TIER_META := "tier_id"
const SIZE_META := "tier_shadow_size"


static func apply(tier: String, viewport: Viewport, env: Environment, sun: DirectionalLight3D) -> void:
	if not Tiers.TABLE.has(tier):
		push_error("RenderApplier: unknown tier %s" % tier)
		return
	var row: Dictionary = Tiers.TABLE[tier]
	var scale: float = row["scale"]
	var msaa: int = row["msaa"]
	viewport.msaa_3d = msaa as Viewport.MSAA
	var fxaa: bool = row["fxaa"]
	viewport.screen_space_aa = (
		Viewport.SCREEN_SPACE_AA_FXAA if fxaa else Viewport.SCREEN_SPACE_AA_DISABLED
	)
	viewport.scaling_3d_mode = (
		Viewport.SCALING_3D_MODE_FSR if scale < 1.0 else Viewport.SCALING_3D_MODE_BILINEAR
	)
	viewport.scaling_3d_scale = scale

	sun.shadow_enabled = row["shadows"]
	var splits: int = row["splits"]
	sun.directional_shadow_mode = splits as DirectionalLight3D.ShadowMode
	var soft_id: int = row["soft"]
	var soft: RenderingServer.ShadowQuality = soft_id as RenderingServer.ShadowQuality
	var atlas: int = row["shadow_size"]
	RenderingServer.directional_shadow_atlas_set_size(atlas, true)
	env.set_meta(SIZE_META, atlas)
	RenderingServer.directional_soft_shadow_filter_set_quality(soft)
	RenderingServer.positional_soft_shadow_filter_set_quality(soft)

	env.glow_enabled = row["glow"]
	env.ssao_enabled = row["ssao"]
	env.ssil_enabled = row["ssil"]
	env.volumetric_fog_enabled = row["vfog"]

	# Depth of field lives on the camera's attributes, not the Environment: store the flag on the environment
	# (readable by summarize) and push it to the current camera when it carries CameraAttributesPractical.
	var dof: bool = row["dof"]
	env.set_meta(DOF_META, dof)
	env.set_meta(TIER_META, tier)
	var cam: Camera3D = viewport.get_camera_3d()
	if cam != null:
		var attrs: CameraAttributesPractical = cam.attributes as CameraAttributesPractical
		if attrs != null:
			attrs.dof_blur_far_enabled = dof


## The applied state, read back from the real objects (DoF, tier id and atlas size come from flags stored on the environment, the server has no getter).
static func summarize(viewport: Viewport, env: Environment, sun: DirectionalLight3D) -> Dictionary:
	return {
		"tier": env.get_meta(TIER_META, ""),
		"msaa": viewport.msaa_3d,
		"fxaa": viewport.screen_space_aa == Viewport.SCREEN_SPACE_AA_FXAA,
		"scale": viewport.scaling_3d_scale,
		"scaling_mode": viewport.scaling_3d_mode,
		"shadows": sun.shadow_enabled,
		"splits": sun.directional_shadow_mode,
		"shadow_size": env.get_meta(SIZE_META, 0),
		"glow": env.glow_enabled,
		"ssao": env.ssao_enabled,
		"ssil": env.ssil_enabled,
		"vfog": env.volumetric_fog_enabled,
		"dof": env.get_meta(DOF_META, false),
	}

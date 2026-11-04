class_name Tiers
extends RefCounted
## The three graphics tiers (the approved F3 table). Every tier keeps the full art; Low only saves hidden cost
## (resolution, shadow maps, screen-space passes). Values mirror the Godot proof's TIERS.

const IDS: Array[String] = ["low", "medium", "high"]

const TABLE: Dictionary = {
	"low": {
		"msaa": Viewport.MSAA_DISABLED, "fxaa": true, "scale": 0.75,
		"shadows": false, "shadow_size": 1024,
		"splits": DirectionalLight3D.SHADOW_ORTHOGONAL, "soft": RenderingServer.SHADOW_QUALITY_HARD,
		"glow": false, "ssao": false, "ssil": false, "dof": false, "vfog": false,
		"grass": 1.0, "scatter": 1.0, "particles": 1.0,
		"lights": 2, "light_shadows": false, "blob_shadow": true,
	},
	"medium": {
		"msaa": Viewport.MSAA_2X, "fxaa": false, "scale": 1.0,
		"shadows": true, "shadow_size": 2048,
		"splits": DirectionalLight3D.SHADOW_PARALLEL_2_SPLITS, "soft": RenderingServer.SHADOW_QUALITY_SOFT_LOW,
		"glow": true, "ssao": true, "ssil": false, "dof": false, "vfog": false,
		"grass": 1.0, "scatter": 1.0, "particles": 1.0,
		"lights": 4, "light_shadows": false, "blob_shadow": false,
	},
	"high": {
		"msaa": Viewport.MSAA_4X, "fxaa": false, "scale": 1.0,
		"shadows": true, "shadow_size": 4096,
		"splits": DirectionalLight3D.SHADOW_PARALLEL_4_SPLITS, "soft": RenderingServer.SHADOW_QUALITY_SOFT_HIGH,
		"glow": true, "ssao": true, "ssil": true, "dof": true, "vfog": true,
		"grass": 1.3, "scatter": 1.5, "particles": 1.4,
		"lights": 8, "light_shadows": true, "blob_shadow": false,
	},
}

## Copied verbatim from apps/web/src/render/quality.ts WEAK_GPU (flag i -> (?i)).
const WEAK_GPU_PATTERN := (
	"(?i)swiftshader|llvmpipe|softpipe|basic render driver|intel\\(r\\) (hd|uhd) graphics|intel hd graphics"
	+ "|mali-[gt]?[0-9]{2}\\b|adreno \\(tm\\) [3-5][0-9]{2}\\b"
)

static var _weak_gpu: RegEx = null


## True for a GPU renderer string that should start on the Low tier.
static func is_weak_gpu(renderer: String) -> bool:
	if _weak_gpu == null:
		_weak_gpu = RegEx.create_from_string(WEAK_GPU_PATTERN)
	return _weak_gpu.search(renderer) != null


## Automatic: weak GPUs start on Low, everything else on Medium. It never picks High.
static func pick_initial(renderer: String) -> String:
	return "low" if is_weak_gpu(renderer) else "medium"


## A stored choice ("auto" or a tier id) to a tier id; anything unknown behaves like auto.
static func resolve(choice: String, renderer: String) -> String:
	if IDS.has(choice):
		return choice
	return pick_initial(renderer)

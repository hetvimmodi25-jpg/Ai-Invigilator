import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

let landmarkerInstance = null;
let landmarkerLoadingPromise = null;

/**
 * Initializes and returns the singleton MediaPipe FaceLandmarker instance.
 */
export async function getFaceLandmarker() {
  if (landmarkerInstance) {
    return landmarkerInstance;
  }
  if (landmarkerLoadingPromise) {
    return await landmarkerLoadingPromise;
  }

  landmarkerLoadingPromise = (async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );

      const landmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
        },
        runningMode: "IMAGE",
        numFaces: 2,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
      });

      landmarkerInstance = landmarker;
      return landmarker;
    } catch (err) {
      console.error("Failed to initialize FaceLandmarker:", err);
      landmarkerLoadingPromise = null;
      throw err;
    }
  })();

  return await landmarkerLoadingPromise;
}

/**
 * Helper to load an image source (data URL, URL, or image element) into an HTMLImageElement.
 */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    if (src instanceof HTMLImageElement && src.complete) {
      return resolve(src);
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error("Failed to load baseline image for face analysis: " + e));
    img.src = typeof src === "string" ? src : src.src;
  });
}

/**
 * Extracts 3D facial landmarks from an image or data URL.
 */
/**
 * Extracts 3D facial landmarks from an image or data URL along with image dimensions.
 */
export async function extractLandmarksFromImage(imageSrc) {
  try {
    const landmarker = await getFaceLandmarker();
    let imgElement;
    if (imageSrc instanceof HTMLCanvasElement || imageSrc instanceof HTMLVideoElement) {
      imgElement = imageSrc;
    } else {
      imgElement = await loadImage(imageSrc);
    }

    const results = landmarker.detect(imgElement);
    if (!results || !results.faceLandmarks || results.faceLandmarks.length === 0) {
      return { success: false, error: "No face detected in photo", count: 0, landmarks: null };
    }

    if (results.faceLandmarks.length > 1) {
      return { success: false, error: "Multiple faces detected. Please provide a single face photo.", count: results.faceLandmarks.length, landmarks: null };
    }

    const width = imgElement.naturalWidth || imgElement.videoWidth || imgElement.width || 640;
    const height = imgElement.naturalHeight || imgElement.videoHeight || imgElement.height || 480;

    return {
      success: true,
      landmarks: results.faceLandmarks[0],
      width,
      height,
      count: 1
    };
  } catch (err) {
    console.error("extractLandmarksFromImage error:", err);
    return { success: false, error: err.message, count: 0, landmarks: null };
  }
}

/**
 * Extracts landmarks from a live video feed along with video dimensions.
 */
export async function extractLandmarksFromVideo(videoElement) {
  if (!videoElement || videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
    return { success: false, error: "Video feed not active", count: 0, landmarks: null };
  }

  try {
    const landmarker = await getFaceLandmarker();
    
    // Draw current video frame to a temporary offscreen canvas
    const canvas = document.createElement("canvas");
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    const results = landmarker.detect(canvas);
    if (!results || !results.faceLandmarks || results.faceLandmarks.length === 0) {
      return { success: false, error: "No face in front of camera", count: 0, landmarks: null };
    }

    if (results.faceLandmarks.length > 1) {
      return { success: false, error: "Multiple people detected in camera frame", count: results.faceLandmarks.length, landmarks: null };
    }

    return {
      success: true,
      landmarks: results.faceLandmarks[0],
      width: videoElement.videoWidth,
      height: videoElement.videoHeight,
      count: 1
    };
  } catch (err) {
    console.error("extractLandmarksFromVideo error:", err);
    return { success: false, error: err.message, count: 0, landmarks: null };
  }
}

/**
 * Distance between two 3D points
 */
function euclideanDist(p1, p2) {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = (p1.z || 0) - (p2.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Normalizes 3D facial landmarks into an upright, scale-invariant, aspect-ratio corrected coordinate system.
 * Eliminates aspect ratio distortion, roll tilt, scale variations, and positional offsets.
 */
function normalizeFaceLandmarks(landmarks, width = 640, height = 480) {
  if (!landmarks || landmarks.length < 468) return null;

  // Convert raw normalized image coordinates [0,1] to isotropic coordinates scaled by aspect ratio H/W
  const aspect = height / width;
  const isoLandmarks = landmarks.map(pt => ({
    x: pt.x,
    y: pt.y * aspect,
    z: pt.z || 0
  }));

  // 1. Left eye center: avg(33, 133, 159, 145)
  const leftEye = {
    x: (isoLandmarks[33].x + isoLandmarks[133].x + isoLandmarks[159].x + isoLandmarks[145].x) / 4,
    y: (isoLandmarks[33].y + isoLandmarks[133].y + isoLandmarks[159].y + isoLandmarks[145].y) / 4,
    z: (isoLandmarks[33].z + isoLandmarks[133].z + isoLandmarks[159].z + isoLandmarks[145].z) / 4,
  };

  // 2. Right eye center: avg(362, 263, 386, 374)
  const rightEye = {
    x: (isoLandmarks[362].x + isoLandmarks[263].x + isoLandmarks[386].x + isoLandmarks[374].x) / 4,
    y: (isoLandmarks[362].y + isoLandmarks[263].y + isoLandmarks[386].y + isoLandmarks[374].y) / 4,
    z: (isoLandmarks[362].z + isoLandmarks[263].z + isoLandmarks[386].z + isoLandmarks[374].z) / 4,
  };

  // 3. Inter-Ocular Distance (IOD) in isotropic metric space
  const iod = Math.max(euclideanDist(leftEye, rightEye), 0.001);

  // 4. Center between eyes (Origin of Normalized Face Space)
  const eyeCenter = {
    x: (leftEye.x + rightEye.x) / 2,
    y: (leftEye.y + rightEye.y) / 2,
    z: (leftEye.z + rightEye.z) / 2,
  };

  // 5. In-plane roll angle (head tilt angle in 2D isotropic space)
  const rollAngle = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);
  const cosA = Math.cos(-rollAngle);
  const sinA = Math.sin(-rollAngle);

  // 6. Upright transform helper for any point
  const transformPoint = (pt) => {
    if (!pt) return { x: 0, y: 0, z: 0 };
    const dx = pt.x - eyeCenter.x;
    const dy = pt.y - eyeCenter.y;
    const dz = pt.z - eyeCenter.z;

    // Rotate by -rollAngle around Z axis to make eyes horizontal
    const rx = dx * cosA - dy * sinA;
    const ry = dx * sinA + dy * cosA;

    // Scale by IOD
    return {
      x: rx / iod,
      y: ry / iod,
      z: dz / iod,
    };
  };

  // Extract key structural landmarks in upright normalized space
  const normPoints = {};
  const anchorIndices = [
    // Forehead & eyebrows
    10, 151, 9, 8, 70, 63, 105, 66, 107, 336, 296, 334, 293, 300,
    // Eyes
    33, 133, 159, 145, 362, 263, 386, 374,
    // Nose
    1, 2, 98, 327, 168, 6, 197, 195, 5, 4, 19, 94,
    // Mouth & lips
    0, 13, 14, 17, 61, 291, 78, 308, 82, 312, 164, 18, 200, 199, 175,
    // Jawline & chin
    152, 172, 397, 58, 136, 149, 176, 148, 377, 400, 378,
    // Cheeks & outer contour
    234, 454, 127, 356, 103, 332
  ];

  anchorIndices.forEach((idx) => {
    normPoints[idx] = transformPoint(isoLandmarks[idx]);
  });

  // Calculate 12 key biometric structural ratios
  const forehead = normPoints[10];
  const chin = normPoints[152];
  const noseTip = normPoints[1];
  const subnasale = normPoints[2];
  const leftMouth = normPoints[61];
  const rightMouth = normPoints[291];
  const leftCheek = normPoints[234];
  const rightCheek = normPoints[454];
  const leftJaw = normPoints[172];
  const rightJaw = normPoints[397];
  const leftNostril = normPoints[98];
  const rightNostril = normPoints[327];
  const origin = { x: 0, y: 0, z: 0 };

  const ratios = [
    euclideanDist(forehead, chin),         // 1. Total Face Height / IOD
    euclideanDist(forehead, noseTip),      // 2. Upper Face Height / IOD
    euclideanDist(noseTip, chin),          // 3. Lower Face Height / IOD
    euclideanDist(leftMouth, rightMouth),  // 4. Mouth Width / IOD
    euclideanDist(leftCheek, rightCheek),  // 5. Cheekbone Width / IOD
    euclideanDist(leftJaw, rightJaw),      // 6. Jaw Width / IOD
    euclideanDist(subnasale, chin),        // 7. Chin Height / IOD
    euclideanDist(origin, noseTip),        // 8. Nose Drop / IOD
    euclideanDist(origin, leftMouth),      // 9. Eye Center to Left Mouth / IOD
    euclideanDist(origin, rightMouth),     // 10. Eye Center to Right Mouth / IOD
    euclideanDist(leftNostril, rightNostril), // 11. Nostril Span / IOD
    euclideanDist(origin, chin),           // 12. Eye Center to Chin / IOD
  ];

  return { normPoints, ratios, anchorIndices };
}

/**
 * Compares two sets of MediaPipe face landmarks or landmark result objects.
 * Returns match confidence (0 - 100%), boolean isMatch, and diagnostic details.
 */
export function compareFaceLandmarks(baselineInput, liveInput, threshold = 60) {
  if (!baselineInput || !liveInput) {
    return {
      isMatch: false,
      confidence: 0,
      geometricSimilarity: 0,
      vectorSimilarity: 0,
      reason: "Missing facial landmarks for comparison",
    };
  }

  const baselineLandmarks = Array.isArray(baselineInput) ? baselineInput : baselineInput.landmarks;
  const liveLandmarks = Array.isArray(liveInput) ? liveInput : liveInput.landmarks;

  const baseW = baselineInput.width || 640;
  const baseH = baselineInput.height || 480;
  const liveW = liveInput.width || 640;
  const liveH = liveInput.height || 480;

  if (!baselineLandmarks || !liveLandmarks) {
    return {
      isMatch: false,
      confidence: 0,
      geometricSimilarity: 0,
      vectorSimilarity: 0,
      reason: "Missing facial landmark arrays",
    };
  }

  const profileBase = normalizeFaceLandmarks(baselineLandmarks, baseW, baseH);
  const profileLive = normalizeFaceLandmarks(liveLandmarks, liveW, liveH);

  if (!profileBase || !profileLive) {
    return {
      isMatch: false,
      confidence: 0,
      geometricSimilarity: 0,
      vectorSimilarity: 0,
      reason: "Unable to extract biometric profile",
    };
  }

  // 1. Point-to-Point Spatial Displacement Metric (L2 Distance in Upright Normalized Isotropic Space)
  let totalWeightedDist = 0;
  let totalWeight = 0;

  profileBase.anchorIndices.forEach((idx) => {
    const pBase = profileBase.normPoints[idx];
    const pLive = profileLive.normPoints[idx];
    if (pBase && pLive) {
      const d = euclideanDist(pBase, pLive);
      let w = 1.0;
      if ([1, 2, 61, 291, 152, 172, 397, 234, 454].includes(idx)) {
        w = 2.0;
      }
      totalWeightedDist += w * (d * d);
      totalWeight += w;
    }
  });

  const rmsDist = Math.sqrt(totalWeightedDist / Math.max(totalWeight, 1.0));
  const landmarkSim = Math.exp(-Math.pow(rmsDist / 0.175, 1.4));

  // 2. Biometric Structural Ratio Similarity Metric
  let ratioDiffSum = 0;
  for (let i = 0; i < profileBase.ratios.length; i++) {
    const baseR = profileBase.ratios[i];
    const liveR = profileLive.ratios[i];
    const relDiff = Math.abs(liveR - baseR) / Math.max(baseR, 0.001);
    ratioDiffSum += relDiff;
  }
  const meanRatioDiff = ratioDiffSum / profileBase.ratios.length;
  const geometricSim = Math.exp(-meanRatioDiff * 5.5);

  // 3. Combined Biometric Confidence Score
  // 50% landmark spatial displacement, 50% geometric proportions
  const combinedScore = (0.50 * landmarkSim + 0.50 * geometricSim) * 100;
  const confidence = Math.min(100, Math.max(0, Math.round(combinedScore)));

  const isMatch = confidence >= threshold;

  return {
    isMatch,
    confidence,
    geometricSimilarity: Math.min(100, Math.max(0, Math.round(geometricSim * 100))),
    vectorSimilarity: Math.min(100, Math.max(0, Math.round(landmarkSim * 100))),
    threshold,
    reason: isMatch
      ? "Biometric identity verified successfully"
      : confidence < 50
      ? "Face does not match registered baseline photo"
      : "Low biometric match confidence. Please face camera directly with good lighting."
  };
}


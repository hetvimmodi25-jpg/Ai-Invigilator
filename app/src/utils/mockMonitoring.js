// Mock AI proctoring events used to simulate live monitoring during the
// Active Exam Monitoring page. Nothing here talks to a real camera/mic -
// it just randomly cycles through the violation types the product spec
// calls out, purely on the frontend.

export const MONITORING_EVENTS = [
  {
    type: 'FACE_NOT_DETECTED',
    title: 'Face Not Detected',
    message: 'We could not detect your face. Please make sure you are clearly visible in the camera frame.',
  },
  {
    type: 'MULTIPLE_PERSON',
    title: 'Multiple Person Detected',
    message: 'More than one person was detected in the camera feed. Only the registered candidate may be present.',
  },
  {
    type: 'LOOKING_AWAY',
    title: 'Looking Away',
    message: 'Please keep looking at the screen. Continuous distraction may result in automatic session termination.',
  },
  {
    type: 'MOBILE_PHONE',
    title: 'Mobile Phone Detected',
    message: 'A mobile phone was detected near your workspace. Please remove all unauthorized devices.',
  },
  {
    type: 'TAB_SWITCH',
    title: 'Tab Switching Detected',
    message: 'Switching browser tabs or windows during the exam is not permitted and has been logged.',
  },
  {
    type: 'HEAD_MOVEMENT',
    title: 'Head Movement',
    message: 'Excessive head movement was detected. Please stay centered and face the camera.',
  },
  {
    type: 'MIC_DISABLED',
    title: 'Microphone Disabled',
    message: 'Your microphone appears to be disabled. Audio monitoring is required throughout the session.',
  },
];

export function pickRandomEvent(exclude) {
  const pool = exclude
    ? MONITORING_EVENTS.filter((e) => e.type !== exclude)
    : MONITORING_EVENTS;
  return pool[Math.floor(Math.random() * pool.length)];
}

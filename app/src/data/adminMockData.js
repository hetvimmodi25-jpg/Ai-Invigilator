// Local, in-memory mock data powering the Live Monitoring, Reports,
// Violations and Settings admin pages. Nothing here calls a real API -
// it exists purely so the UI has believable, consistent data to render
// and filter/search/paginate against on the frontend.

const AVATARS = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDN-YCMvfBa0Twy0A3Mt1tIQqeVcI5yY0bmRMw2xFHNZ4j3vmQMaIaXLJZWXTxLccJIagAgBj2WzSuE8aeu33wsn5gwzzDaohL0--3R_edn7NS7PCBJkIh3kUXb-OwiJqd2UX1b48PgJ8A7W1_or7-2Y--gk9CxsK8hfc-lT8e_wPOK6RKR-LTuqfG4Ln9EAYNk0jS4tgcl_Zl5Olbu_ekcevA4TmXMMD7_Cbr4W5zQvSR-iPlKdV1UuqdrGTX66O_v6YA63qp7kjo',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDk_Ubzrg03eR-DTdS-h36i96AJWbxRGyd5uJrYOmPs8Rk2OgWF84Rw23LLV5bQLrQnfMH9QcFQ20LFEU4gzOVwwaST-GJLDChk_dMndknubjF4iId4O2Tde-Iy79K_vY-efKIqCUTiYjtvJspDVMUk8yCwQdJXnGMXdARcyyO0doPQU6Pi8Gx5qCJ1F4LYDn9OMKLUYQVrE5Ei5CFDpcyimT_VuXY3N0tw088JSJQYM0pY1xfntZ_32f6HMqLZdNJejAHffJaDQUc',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCQ5Do9OHDFqtzKbtIKmwxDs18PXqJ2WK2Bge8M0ivLmOWAAEwSMf9Xqw9CDd5Dl-_50J2CuSBuD2ugLUYC1ZwSS0ro76hVtuLik0AoTHQQlboieih_ZNTPOYHFRVB7jsrFO6soDAoP4NrePTylWXPeHoMdnDFBEGZ6Rpdj6Ogs-5-q4KkYkc8EEDNBXFB63rXdgXIE7Dc8XWFhvXy_e-D4PmHd-WjZCG7k-cJ1g2WO2_9MUckL5TtvJ9XYbh_HpSvgWo0Rm4mug-4',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuC2_2sCfe4SLVdsOdbEH4cNsBiSypuiP0FxhBR89ct9lr9EH7a6wv3J3gX1RlnlVgjpeFY_wNLYs9BKVx_MTEImhX2B_meeJl5P4mg4k6oIYbDUCII2RCMJh_FDTQ2WloOTADIG-51gRUaC55Ri43XKSbmNXmZG2b20l1v0A591zpIuzILz3YqF2-WjfvnsZOFtja8ifCK9noSU_wHxGob4vAxDOWKYAJB3R97aeRG3jVfHxa9i1ukghYK-iLj95A7bnKLPA2cqvxw',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDVK52GLEBnSkla2S3MRuJw-GKebk-U119qcYtZJdxoOk28owL8PbjrGcUSi3tdiBkYKIPeFXFlHMv2T64arsWEGdqYlEa32D8aGd8ucOhDVZBDMIsdkwZtl2bMLuNQEc84oBjRFk3awv3jldALLcrbOJrI9mG3ylqYIjOHZKO5UMfjqoC9e6xvUKGJWNn-aQAQ70PVNX157MPhSVbO7o-J2GzeGlwi4XZAvOby1JW_2VhhqsJ9ipsn1NmOhluzVLMVu_q8BseNXsE',
];

const NAMES = [
  'Elena Rodriguez', 'Marcus Chen', 'Julia Vance', 'Leo Sterling', 'Mia Kowalski',
  'Alexander Wright', 'Priya Patel', 'Noah Bennett', 'Sofia Alvarez', 'Ethan Brooks',
  'Ava Thompson', 'Daniel Kim', 'Grace Nakamura', 'Omar Hassan', 'Lily Zhang',
  'Ryan O\'Connell', 'Isabella Rossi', 'Kwame Mensah', 'Chloe Fischer', 'Diego Morales',
];

const DEPARTMENTS = ['Computer Science', 'Mathematics', 'Physics', 'Business Admin', 'Biology', 'Economics'];
const EXAMS = ['CS401 - Algorithms', 'MTH210 - Linear Algebra', 'PHY301 - Quantum Mechanics', 'BUS110 - Marketing', 'BIO220 - Genetics', 'ECO150 - Macroeconomics'];
const VIOLATION_TYPES = ['Tab Switch', 'Phone Detected', 'Gaze Deviation', 'Multiple Faces', 'No Face Present', 'Audio Anomaly'];

function seededRandom(seed) {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

const rand = seededRandom(42);

function pick(arr) {
  return arr[Math.floor(rand() * arr.length)];
}

export function generateStudents(count = 20) {
  return Array.from({ length: count }, (_, i) => {
    const violationCount = Math.floor(rand() * 5);
    const status = violationCount >= 2 ? 'Warning' : 'Active';
    return {
      id: `2024-${1000 + i}-${NAMES[i % NAMES.length].slice(0, 2).toUpperCase()}`,
      name: NAMES[i % NAMES.length],
      exam: pick(EXAMS),
      dept: pick(DEPARTMENTS),
      avatar: AVATARS[i % AVATARS.length],
      status,
      violationCount,
      timeRemaining: `${String(Math.floor(rand() * 2)).padStart(2, '0')}:${String(Math.floor(rand() * 59)).padStart(2, '0')}:${String(Math.floor(rand() * 59)).padStart(2, '0')}`,
    };
  });
}

export function generateReports(count = 32) {
  return Array.from({ length: count }, (_, i) => {
    const risk = Math.floor(rand() * 100);
    const status = risk > 70 ? 'Flagged' : risk > 35 ? 'Review' : 'Clean';
    const day = String(1 + Math.floor(rand() * 27)).padStart(2, '0');
    return {
      id: `RPT-${5000 + i}`,
      studentName: NAMES[i % NAMES.length],
      examId: `EX-${2000 + i}`,
      exam: pick(EXAMS),
      date: `2024-06-${day}`,
      riskScore: risk,
      status,
    };
  });
}

export function generateViolations(count = 45) {
  return Array.from({ length: count }, (_, i) => {
    const type = pick(VIOLATION_TYPES);
    const severityRoll = rand();
    const status = severityRoll > 0.7 ? 'Critical' : severityRoll > 0.35 ? 'Pending' : 'Resolved';
    const hh = String(Math.floor(rand() * 24)).padStart(2, '0');
    const mm = String(Math.floor(rand() * 60)).padStart(2, '0');
    const ss = String(Math.floor(rand() * 60)).padStart(2, '0');
    return {
      id: `VIO-${9000 + i}`,
      studentName: NAMES[i % NAMES.length],
      avatar: AVATARS[i % AVATARS.length],
      type,
      timestamp: `2024-06-${String(1 + (i % 27)).padStart(2, '0')} ${hh}:${mm}:${ss}`,
      status,
    };
  });
}

export const NAMES_LIST = NAMES;
export const EXAMS_LIST = EXAMS;
export const DEPARTMENTS_LIST = DEPARTMENTS;
export const VIOLATION_TYPES_LIST = VIOLATION_TYPES;

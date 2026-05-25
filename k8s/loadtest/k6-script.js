import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://backend.itmovito.svc.cluster.local:3000';

export default function () {
  const res = http.get(`${BASE_URL}/item`);
  check(res, {
    'status is 2xx': (r) => r.status >= 200 && r.status < 300,
  });
  sleep(0.1);
}

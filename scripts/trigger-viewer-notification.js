const fetch = globalThis.fetch;

async function createNotif(title) {
  const sessionTitle = title || ('Virtual Video Sync: Security Architecture ' + Date.now());
  const auth = await fetch('http://localhost:8081/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  }).then((r) => r.json());

  const res = await fetch(
    'http://localhost:8081/api/v1/discussions/76e8cebc-5358-4657-bb3b-032639c56fb4/video-sessions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + auth.access_token,
      },
      body: JSON.stringify({
        title: sessionTitle,
        invitedUsernames: ['viewer'],
      }),
    }
  ).then((r) => r.json());

  console.log('Notification created for viewer with session:', res.id, res.title);
}

createNotif(process.argv[2]);

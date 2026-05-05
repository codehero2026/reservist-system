const url = "http://localhost:3000/api/auth/debug-login";

async function test(email, password) {
  console.log(`\nTesting ${email}:${password}...`);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    console.log(`Result: ${data.step} - ${data.reason}`);
  } catch (e) {
    console.error("Fetch failed:", e.message);
  }
}

async function run() {
  await test("admin@h12rcdg.mil.ph", "Admin@12345");
  await test("s1officer@h12rcdg.mil.ph", "S1Officer@12345");
  await test("clerk.alpha@h12rcdg.mil.ph", "Clerk@12345");
  await test("viewer@h12rcdg.mil.ph", "Viewer@12345");
}
run();

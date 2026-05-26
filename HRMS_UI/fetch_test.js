async function run() {
  try {
    const res = await fetch("https://hrms-ui-emgn.onrender.com/dashboard/recruitment");
    console.log("STATUS:", res.status);
    console.log("HEADERS:", Array.from(res.headers.entries()));
    const text = await res.text();
    console.log("BODY LENGTH:", text.length);
  } catch (e) {
    console.error("ERROR:", e);
  }
}
run();

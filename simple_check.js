async function check() {
    try {
        const res = await fetch('http://localhost:3000/');
        const data = await res.json();
        console.log('Result:', data);
    } catch (e) {
        console.error('Error:', e);
    }
}
check();

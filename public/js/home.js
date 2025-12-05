// public/js/home.js
document.addEventListener('DOMContentLoaded', () => {
    const btnCreate = document.getElementById('btn-create');
    const btnJoin = document.getElementById('btn-join');

    btnCreate.onclick = async () => {
        const name = document.getElementById('create-name').value.trim();
        const resDiv = document.getElementById('create-result');
        resDiv.textContent = '';
        if (!name) { resDiv.textContent = 'Enter your name.'; return; }

        try {
            const resp = await fetch('/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            const data = await resp.json();
            if (data.error) { resDiv.textContent = data.error; return; }
            window.location.href = `/game.html?token=${data.token}&name=${encodeURIComponent(name)}&as=master`;
        } catch (e) {
            resDiv.textContent = 'Failed to create. Try again.';
        }
    };

    btnJoin.onclick = () => {
        const name = document.getElementById('join-name').value.trim();
        const token = document.getElementById('join-token').value.trim().toUpperCase();
        const resDiv = document.getElementById('join-result');
        resDiv.textContent = '';
        if (!name || !token) { resDiv.textContent = 'Name and token required.'; return; }

        window.location.href = `/game.html?token=${token}&name=${encodeURIComponent(name)}&as=player`;
    };
});

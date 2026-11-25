document.getElementById('u').textContent = new URLSearchParams(location.search).get('url') || '';
document.getElementById('back').addEventListener('click', () => history.go(-2));

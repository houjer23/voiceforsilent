/* --- tiny helper --------------------------------------------------- */
function getQueryParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }
  
  /* --- convert your simple Rich‑Text JSON to HTML -------------------- */
  function richToHTML(node) {
    if (node.type === 'PARAGRAPH') {
      const inner = node.nodes.map(richToHTML).join('');
      return `<p>${inner}</p>`;
    }
    if (node.type === 'TEXT') {
      let txt = node.textData.text
        .replace(/&/g,'&amp;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;');
      const hasBold = node.decorations?.some(d => d.type === 'BOLD');
      if (hasBold) txt = `<strong>${txt}</strong>`;
      return txt;
    }
    /* fallback – ignore unhandled types */
    return '';
  }
  
  /* --- main ---------------------------------------------------------- */
  async function loadPost() {
    const slug = getQueryParam('slug');
    if (!slug) return (document.body.textContent = 'Missing slug.');
  
    const csv   = await fetch('Posts.csv').then(r => r.text());
    const rows  = csv.trim().split(/\r?\n/);
    const heads = rows.shift().split(',');
    const idxSlug = heads.findIndex(h => h.replace(/"/g,'').trim() === 'Slug');
  
    const row = rows
      .map(line => line.match(/("([^"]|"")*"|[^,]*)/g))
      .find(vals => vals[idxSlug].replace(/^"|"$/g,'') === slug);
  
    if (!row) return (document.body.textContent = 'Post not found.');
  
    const post = Object.fromEntries(
      row.map((v,i)=>[heads[i].replace(/"/g,'').trim(),
                      v.replace(/^"|"$/g,'').replace(/""/g,'"')])
    );
  
    /* build HTML ------------------------------------------------------ */
    const art = document.getElementById('post');
    art.innerHTML = `
      <h1>${post.Title}</h1>
      <p class="meta">
         ${new Date(post['Published Date'])
            .toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'})}
         · ${post['Time To Read']} min read
      </p>`;
  
    /* render rich content (fallback to Plain Content if empty) */
    let rich = post['Rich Content'];
    try   { rich = JSON.parse(rich || '{}'); }
    catch { rich = {}; }
  
    if (rich.nodes) {
      art.innerHTML += rich.nodes.map(richToHTML).join('');
    } else {
      art.innerHTML += `<p>${post['Plain Content']}</p>`;
    }
  }
  
  document.addEventListener('DOMContentLoaded', loadPost);
  
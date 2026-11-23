/* My files (2026-11-23, owner: "member storage ... reached from your profile ... a folder structure of all your saves").
 * Shared by the Smart Generator and the profile page. Talks to concierge-api /api/files (migration 0036) and the
 * shared /api/clients registry. Folders are client > job. Members only; reads also work for lapsed members, saving
 * needs a paid membership (the server decides).
 * A downloaded file is {app:'neewoody-files', v:1, tool, name, data}; uploading one opens it again on any account.
 * Needs js/concierge.js first. Sets window.MyFiles. */
(function () {
  'use strict';
  var C = window.Concierge, APP = 'neewoody-files';
  function member() { return !!(C && C.tokenAlive && C.tokenAlive()); }
  function api(path, opt) { return C.api(path, opt); }

  var M = {
    member: member,
    list: function () { return api('/files').then(function (r) { return r.files || []; }); },
    get: function (id) { return api('/files/' + id).then(function (r) { return r.file; }); },
    create: function (o) { return api('/files', { method: 'POST', body: o }).then(function (r) { return r.file; }); },
    update: function (id, o) { return api('/files/' + id, { method: 'PUT', body: o }).then(function (r) { return r.file; }); },
    remove: function (id) { return api('/files/' + id, { method: 'DELETE' }); },
    clients: function () { return api('/clients').then(function (r) { return r.clients || []; }); },
    ensureClient: function (name) { return api('/clients', { method: 'POST', body: { name: name } }).then(function (r) { return r.client; }); },
    // message for an error code from the server
    err: function (e) {
      var c = (e && e.data && e.data.error) || (e && e.message) || '';
      if (/too_many_files/.test(c)) return 'You have reached the most files an account can hold (300). Delete some first.';
      if (/file_too_large/.test(c)) return 'This file is too big to save (over 256 KB).';
      if (/payment_required|renew_required/.test(c)) return 'Saving needs an active membership. You can still open and download your files.';
      return (e && e.message) || 'Something went wrong. Check your connection and try again.';
    }
  };

  // ---------- download and upload ----------
  M.download = function (name, tool, data) {
    var blob = new Blob([JSON.stringify({ app: APP, v: 1, tool: tool, name: name, data: data }, null, 1)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = String(name || 'file').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') + '.nwd.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  };
  M.readUpload = function (file) {
    return new Promise(function (res, rej) {
      if (!file) return rej(new Error('No file chosen.'));
      if (file.size > 300 * 1024) return rej(new Error('That file is too big to be a Neewoody file.'));
      var fr = new FileReader();
      fr.onload = function () {
        try {
          var o = JSON.parse(fr.result);
          if (!o || o.app !== APP || !o.tool || !o.data) throw 0;
          res(o);
        } catch (e) { rej(new Error('That is not a Neewoody file (it should end in .nwd.json).')); }
      };
      fr.onerror = function () { rej(new Error('Could not read that file.')); };
      fr.readAsText(file);
    });
  };

  // ---------- the folder dialog: name, client, job ----------
  var css = '.mf-dlg{border:none;border-radius:8px;padding:0;max-width:440px;width:calc(100% - 32px);color:#17130f;background:#f7f3ec;box-shadow:0 12px 40px rgba(0,0,0,.3)}' +
    '.mf-dlg::backdrop{background:rgba(23,19,15,.45)}.mf-dlg form{padding:1.2rem 1.3rem 1.3rem}.mf-dlg h2{font-size:1.15rem;font-weight:600;margin:0 0 .8rem}' +
    '.mf-dlg label{display:block;font-size:.85rem;font-weight:600;margin:.7rem 0 .3rem}.mf-dlg input,.mf-dlg select{width:100%;font:inherit;font-size:1rem;padding:.6rem .7rem;border:1px solid #c9c0b3;border-radius:5px;background:#fff;box-sizing:border-box}' +
    '.mf-dlg .mf-hint{font-size:.8rem;color:#554d43;margin-top:.3rem}.mf-dlg .mf-acts{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:1.1rem}' +
    '.mf-dlg button{font:inherit;font-size:.9rem;font-weight:600;padding:.6rem 1rem;border-radius:5px;cursor:pointer;border:1.5px solid #1f2f58;background:transparent;color:#1f2f58}' +
    '.mf-dlg button.mf-go{background:#1f2f58;color:#fff}.mf-dlg .mf-msg{min-height:1.2em;font-size:.85rem;margin-top:.6rem;color:#8a2a1a}' +
    '.mf-dlg .mf-list{max-height:50vh;overflow:auto;margin:.2rem 0 0;padding:0;list-style:none}.mf-dlg .mf-list li{margin:0}' +
    '.mf-dlg .mf-list button{display:block;width:100%;text-align:left;border:none;border-bottom:1px solid #e1d9cc;border-radius:0;padding:.6rem .2rem;color:#17130f;font-weight:500}' +
    '.mf-dlg .mf-list button:hover,.mf-dlg .mf-list button:focus{background:#efe9df}.mf-dlg .mf-grp{font-size:.8rem;font-weight:600;color:#554d43;margin:.8rem 0 .2rem}' +
    '.mf-dlg .mf-list small{display:block;color:#554d43;font-weight:400;font-size:.78rem}';
  function addCss() { if (document.getElementById('mf-css')) return; var s = document.createElement('style'); s.id = 'mf-css'; s.textContent = css; document.head.appendChild(s); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  M.esc = esc;

  // opts: {title, name, clientId, job, clients, files (for job suggestions), primary, secondary, askName}
  // resolves {action:'primary'|'secondary', name, client_id, job} or null (cancelled); a new client is created first
  M.folderDialog = function (o) {
    addCss();
    return new Promise(function (resolve) {
      var d = document.createElement('dialog'); d.className = 'mf-dlg';
      var cl = (o.clients || []).slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
      var jobs = {}; (o.files || []).forEach(function (f) { if (f.job) jobs[f.job] = 1; });
      d.innerHTML = '<form method="dialog"><h2>' + esc(o.title) + '</h2>' +
        (o.askName === false ? '' : '<label for="mf-name">Name</label><input id="mf-name" maxlength="80" required value="' + esc(o.name || '') + '">') +
        '<label for="mf-client">Client (the folder)</label><select id="mf-client"><option value="">No client</option>' +
        cl.map(function (c) { return '<option value="' + c.id + '"' + (+o.clientId === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') +
        '<option value="new">New client…</option></select>' +
        '<div id="mf-newwrap" hidden><label for="mf-new">New client name</label><input id="mf-new" maxlength="80"></div>' +
        '<label for="mf-job">Job (a folder inside the client)</label><input id="mf-job" maxlength="80" list="mf-jobs" placeholder="e.g. Kitchen, Laundry" value="' + esc(o.job || '') + '">' +
        '<datalist id="mf-jobs">' + Object.keys(jobs).map(function (j) { return '<option value="' + esc(j) + '">'; }).join('') + '</datalist>' +
        '<div class="mf-acts"><button type="button" class="mf-go" data-a="primary">' + esc(o.primary || 'Save') + '</button>' +
        (o.secondary ? '<button type="button" data-a="secondary">' + esc(o.secondary) + '</button>' : '') +
        '<button type="button" data-a="cancel">Cancel</button></div><div class="mf-msg" role="status"></div></form>';
      document.body.appendChild(d);
      var sel = d.querySelector('#mf-client'), nw = d.querySelector('#mf-newwrap'), msg = d.querySelector('.mf-msg');
      sel.addEventListener('change', function () { nw.hidden = sel.value !== 'new'; if (!nw.hidden) d.querySelector('#mf-new').focus(); });
      function done(v) { d.close(); d.remove(); resolve(v); }
      d.addEventListener('cancel', function (e) { e.preventDefault(); done(null); });
      d.querySelectorAll('[data-a]').forEach(function (b) {
        b.addEventListener('click', function () {
          var a = b.dataset.a; if (a === 'cancel') return done(null);
          var nameEl = d.querySelector('#mf-name'), name = nameEl ? nameEl.value.trim() : '';
          if (nameEl && !name) { msg.textContent = 'Give it a name.'; nameEl.focus(); return; }
          var job = d.querySelector('#mf-job').value.trim();
          if (sel.value === 'new') {
            var cn = d.querySelector('#mf-new').value.trim();
            if (!cn) { msg.textContent = 'Type the new client\'s name.'; return; }
            b.disabled = true; msg.textContent = 'Adding the client…';
            M.ensureClient(cn).then(function (c) { done({ action: a, name: name, client_id: c.id, job: job, newClient: c }); })
              .catch(function (e) { b.disabled = false; msg.textContent = M.err(e); });
            return;
          }
          done({ action: a, name: name, client_id: sel.value ? +sel.value : null, job: job });
        });
      });
      d.showModal();
      var first = d.querySelector('#mf-name') || sel; first.focus();
    });
  };

  // pick one file from a list, grouped by client > job; resolves the file or null
  M.pickDialog = function (title, files, clients) {
    addCss();
    return new Promise(function (resolve) {
      var names = {}; (clients || []).forEach(function (c) { names[c.id] = c.name; });
      var groups = {};
      files.forEach(function (f) { var g = (names[f.client_id] || 'No client') + (f.job ? ' › ' + f.job : ''); (groups[g] = groups[g] || []).push(f); });
      var keys = Object.keys(groups).sort(function (a, b) { return (a.indexOf('No client') === 0) - (b.indexOf('No client') === 0) || a.localeCompare(b); });
      var d = document.createElement('dialog'); d.className = 'mf-dlg';
      d.innerHTML = '<form method="dialog"><h2>' + esc(title) + '</h2>' + (files.length ? keys.map(function (k) {
        return '<div class="mf-grp">' + esc(k) + '</div><ul class="mf-list">' + groups[k].map(function (f) {
          return '<li><button type="button" data-id="' + f.id + '">' + esc(f.name) + '<small>saved ' + esc(String(f.updated_at || '').slice(0, 16)) + '</small></button></li>'; }).join('') + '</ul>';
      }).join('') : '<p>You have no saved files here yet.</p>') + '<div class="mf-acts"><button type="button" data-a="cancel">Cancel</button></div></form>';
      document.body.appendChild(d);
      function done(v) { d.close(); d.remove(); resolve(v); }
      d.addEventListener('cancel', function (e) { e.preventDefault(); done(null); });
      d.querySelector('[data-a="cancel"]').onclick = function () { done(null); };
      d.querySelectorAll('[data-id]').forEach(function (b) { b.onclick = function () { done(files.filter(function (f) { return f.id === +b.dataset.id; })[0]); }; });
      d.showModal();
    });
  };

  window.MyFiles = M;
})();

/* ============================================================
   NCHSM SUPERADMIN - STUDENT BLOG MANAGEMENT
   External module: ./js/superadmin-blog.js
   Requires: window.db.supabase (existing SuperAdmin database client)
   Table: student_blog_posts
   ============================================================ */
(function () {
  'use strict';

  const TABLE = 'student_blog_posts';
  let posts = [];
  let initialized = false;

  const $ = id => document.getElementById(id);

  // ============================================================
  // SUPABASE CLIENT
  // Uses the same working NCHSM Supabase project as the portal.
  // Never overwrite window.supabase: the CDN uses that object
  // for createClient().
  // ============================================================
  function getClient() {
    if (window.db?.supabase && typeof window.db.supabase.from === 'function') {
      return window.db.supabase;
    }

    if (window.nchsmSupabase && typeof window.nchsmSupabase.from === 'function') {
      return window.nchsmSupabase;
    }

    if (window.sb && typeof window.sb.from === 'function') {
      return window.sb;
    }

    if (window.supabaseClient && typeof window.supabaseClient.from === 'function') {
      return window.supabaseClient;
    }

    const SUPABASE_URL = 'https://lwhtjozfsmbyihenfunw.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTgxMjcsImV4cCI6MjA3NTIzNDEyN30.7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk';

    if (window.supabase && typeof window.supabase.createClient === 'function') {
      try {
        const client = window.supabase.createClient(
          SUPABASE_URL,
          SUPABASE_ANON_KEY
        );

        window.sb = client;
        window.nchsmSupabase = client;
        return client;
      } catch (error) {
        console.error('❌ SuperAdmin Blog: Supabase initialization failed:', error);
      }
    }

    return null;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function formatDate(value) {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function statusBadge(status) {
    const map = {
      pending: ['#fff7ed', '#c2410c', 'Pending'],
      approved: ['#ecfdf5', '#047857', 'Approved'],
      rejected: ['#fef2f2', '#b91c1c', 'Rejected']
    };
    const s = map[status] || ['#f1f5f9', '#475569', status || 'Unknown'];
    return `<span style="display:inline-flex;padding:4px 9px;border-radius:999px;background:${s[0]};color:${s[1]};font-size:11px;font-weight:700;">${escapeHtml(s[2])}</span>`;
  }

  function setLoading() {
    const body = $('superadminBlogTableBody');
    if (body) body.innerHTML = '<tr><td colspan="6" style="padding:40px;text-align:center;color:#64748b;"><i class="fas fa-spinner fa-spin"></i> Loading blog posts...</td></tr>';
  }

  function notify(message, type) {
    if (typeof window.showNotification === 'function') {
      window.showNotification(message, type || 'info');
    } else {
      console.log(message);
      alert(message);
    }
  }

  function updateStats() {
    const all = posts.length;
    const pending = posts.filter(p => p.status === 'pending').length;
    const approved = posts.filter(p => p.status === 'approved').length;
    const featured = posts.filter(p => p.is_featured === true).length;
    if ($('blogStatAll')) $('blogStatAll').textContent = all;
    if ($('blogStatPending')) $('blogStatPending').textContent = pending;
    if ($('blogStatApproved')) $('blogStatApproved').textContent = approved;
    if ($('blogStatFeatured')) $('blogStatFeatured').textContent = featured;
    const badge = $('sidebarBlogPendingBadge');
    if (badge) {
      badge.textContent = pending;
      badge.style.display = pending ? 'inline-block' : 'none';
    }
  }

  function filteredPosts() {
    const q = (($('superadminBlogSearch')?.value || '')).trim().toLowerCase();
    const status = $('superadminBlogStatus')?.value || 'all';
    return posts.filter(p => {
      const hay = `${p.title || ''} ${p.author_name || ''} ${p.category || ''}`.toLowerCase();
      return (!q || hay.includes(q)) && (status === 'all' || p.status === status);
    });
  }

  function render() {
    const body = $('superadminBlogTableBody');
    if (!body) return;
    const rows = filteredPosts();
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="6" style="padding:40px;text-align:center;color:#64748b;"><i class="fas fa-blog" style="font-size:22px;margin-bottom:8px;display:block;"></i>No blog posts found.</td></tr>';
      return;
    }
    body.innerHTML = rows.map(p => {
      const featured = p.is_featured ? '<span style="color:#d97706;font-size:11px;font-weight:700;margin-left:5px;">★ Featured</span>' : '';
      return `<tr style="border-top:1px solid #eef2f7;">
        <td style="padding:13px;max-width:300px;"><div style="font-weight:700;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(p.title || 'Untitled')}</div>${featured}</td>
        <td style="padding:13px;color:#475569;">${escapeHtml(p.author_name || 'Unknown')}</td>
        <td style="padding:13px;color:#475569;">${escapeHtml(p.category || 'General')}</td>
        <td style="padding:13px;">${statusBadge(p.status)}</td>
        <td style="padding:13px;color:#64748b;white-space:nowrap;">${formatDate(p.created_at)}</td>
        <td style="padding:13px;text-align:right;white-space:nowrap;">
          <button class="sa-blog-action" style="background:#eef2ff;color:#4338ca" onclick="window.viewSuperAdminBlogPost('${p.id}')"><i class="fas fa-eye"></i></button>
          ${p.status === 'pending' ? `<button class="sa-blog-action" style="background:#ecfdf5;color:#047857" onclick="window.approveSuperAdminBlogPost('${p.id}')"><i class="fas fa-check"></i></button><button class="sa-blog-action" style="background:#fff7ed;color:#c2410c" onclick="window.rejectSuperAdminBlogPost('${p.id}')"><i class="fas fa-times"></i></button>` : ''}
          ${p.status === 'approved' ? `<button class="sa-blog-action" style="background:#fffbeb;color:#b45309" onclick="window.toggleSuperAdminBlogFeature('${p.id}')"><i class="fas fa-star"></i></button>` : ''}
          <button class="sa-blog-action" style="background:#fef2f2;color:#b91c1c" onclick="window.deleteSuperAdminBlogPost('${p.id}')"><i class="fas fa-trash"></i></button>
        </td>
      </tr>`;
    }).join('');
  }

  async function load() {
    if (load.inProgress) return;
    load.inProgress = true;

    const supabase = getClient();
    if (!supabase) {
      notify('Database connection is not available yet. Please try again.', 'error');
      return;
    }
    setLoading();
    try {
      const { data, error } = await supabase.from(TABLE).select('*').order('created_at', { ascending: false });
      if (error) throw error;
      posts = Array.isArray(data) ? data : [];
      updateStats();
      render();
    } catch (err) {
      console.error('Student Blog load error:', err);
      const body = $('superadminBlogTableBody');
      if (body) body.innerHTML = `<tr><td colspan="6" style="padding:35px;text-align:center;color:#b91c1c;">Unable to load blog posts.<br><small>${escapeHtml(err.message || 'Database error')}</small></td></tr>`;
      notify('Unable to load Student Blog posts. Check the student_blog_posts table and SuperAdmin RLS permissions.', 'error');
    } finally {
      load.inProgress = false;
    }
  }

  function openModal(title, html) {
    let modal = $('superadminBlogModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'superadminBlogModal';
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.62);display:flex;align-items:center;justify-content:center;padding:20px;z-index:10000;';
      document.body.appendChild(modal);
    }
    modal.innerHTML = `<div style="background:white;border-radius:16px;max-width:850px;width:100%;max-height:90vh;overflow:auto;box-shadow:0 20px 60px rgba(0,0,0,.25);"><div style="padding:18px 22px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;"><h3 style="margin:0;color:#1e293b;">${escapeHtml(title)}</h3><button onclick="document.getElementById('superadminBlogModal').remove()" style="border:0;background:#f1f5f9;border-radius:8px;width:34px;height:34px;cursor:pointer;font-size:18px;">&times;</button></div><div style="padding:22px;">${html}</div></div>`;
  }

  window.viewSuperAdminBlogPost = function (id) {
    const p = posts.find(x => String(x.id) === String(id));
    if (!p) return;
    const image = p.featured_image ? `<img src="${escapeHtml(p.featured_image)}" alt="" style="width:100%;max-height:320px;object-fit:cover;border-radius:12px;margin-bottom:18px;">` : '';
    openModal(p.title || 'Blog Post', `${image}<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:15px;">${statusBadge(p.status)}<span style="background:#f1f5f9;color:#475569;padding:4px 9px;border-radius:999px;font-size:11px;font-weight:700;">${escapeHtml(p.category || 'General')}</span></div><p style="color:#64748b;font-size:13px;"><strong>Author:</strong> ${escapeHtml(p.author_name || 'Unknown')} &nbsp; • &nbsp; <strong>Published:</strong> ${formatDate(p.published_at || p.created_at)}</p><div style="line-height:1.75;color:#334155;white-space:pre-wrap;">${escapeHtml(p.content || '')}</div>${p.rejection_reason ? `<div style="margin-top:18px;padding:12px;background:#fef2f2;border-radius:10px;color:#991b1b;"><strong>Rejection reason:</strong> ${escapeHtml(p.rejection_reason)}</div>` : ''}`);
  };

  async function updatePost(id, changes) {
    const supabase = getClient();
    if (!supabase) throw new Error('Database connection unavailable');
    const { error } = await supabase.from(TABLE).update(changes).eq('id', id);
    if (error) throw error;
  }

  window.approveSuperAdminBlogPost = async function (id) {
    if (!confirm('Approve this student blog post and publish it?')) return;
    try {
      await updatePost(id, { status: 'approved', rejection_reason: null, published_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      notify('Blog post approved successfully.', 'success');
      await load();
    } catch (err) { console.error(err); notify(`Approval failed: ${err.message}`, 'error'); }
  };

  window.rejectSuperAdminBlogPost = async function (id) {
    const reason = prompt('Enter the reason for rejecting this post:');
    if (reason === null) return;
    try {
      await updatePost(id, { status: 'rejected', rejection_reason: reason.trim() || 'Does not meet publication requirements.', updated_at: new Date().toISOString() });
      notify('Blog post rejected.', 'success');
      await load();
    } catch (err) { console.error(err); notify(`Rejection failed: ${err.message}`, 'error'); }
  };

  window.toggleSuperAdminBlogFeature = async function (id) {
    const p = posts.find(x => String(x.id) === String(id));
    if (!p) return;
    try {
      await updatePost(id, { is_featured: !p.is_featured, updated_at: new Date().toISOString() });
      notify(p.is_featured ? 'Post removed from Featured.' : 'Post marked as Featured.', 'success');
      await load();
    } catch (err) { console.error(err); notify(`Feature update failed: ${err.message}`, 'error'); }
  };

  window.deleteSuperAdminBlogPost = async function (id) {
    if (!confirm('Delete this blog post permanently? This cannot be undone.')) return;
    const supabase = getClient();
    if (!supabase) return notify('Database connection unavailable.', 'error');
    try {
      const { error } = await supabase.from(TABLE).delete().eq('id', id);
      if (error) throw error;
      notify('Blog post deleted.', 'success');
      await load();
    } catch (err) { console.error(err); notify(`Delete failed: ${err.message}`, 'error'); }
  };

  window.loadSuperAdminBlog = load;
  window.refreshSuperAdminBlog = load;

  window.initSuperAdminBlog = function () {
    if (initialized) { load(); return; }
    initialized = true;
    const search = $('superadminBlogSearch');
    const status = $('superadminBlogStatus');
    if (search) search.addEventListener('input', render);
    if (status) status.addEventListener('change', render);
    load();
  };

  function boot() {
    const link = document.querySelector('#mainNav a[data-tab="student-blog-management"]');

    if (link) {
      link.addEventListener('click', () => {
        setTimeout(() => {
          if (typeof window.initSuperAdminBlog === 'function') {
            window.initSuperAdminBlog();
          }
        }, 250);
      });
    }

    const active = document.querySelector('.tab-content.active');
    if (active && active.id === 'student-blog-management') {
      setTimeout(window.initSuperAdminBlog, 400);
    }

    // Retry briefly while the main SuperAdmin database client initializes.
    let attempts = 0;
    const timer = setInterval(() => {
      attempts++;

      if (getClient()) {
        clearInterval(timer);
        load();
      }

      if (attempts >= 15) {
        clearInterval(timer);
      }
    }, 1000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

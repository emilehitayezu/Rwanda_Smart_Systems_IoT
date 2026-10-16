import React from 'react';
import { ArrowLeft, FileText, LogOut, MessageCircle, Plus, Save, Send, Trash2, Users, Waves } from 'lucide-react';
import { supabase } from './lib/supabase';
import './admin.css';

const emptySolution = {
  number: '',
  title: '',
  menu_title: '',
  menu_subtitle: '',
  details: '',
  description: '',
  image_url: '',
  solution_link: '',
  solution_link_label: 'Open solution',
  color: 'orange',
  display_order: 1,
  is_published: true,
};

const emptyMember = {
  role: '',
  name: '',
  email: '',
  description: '',
  image_url: '',
  display_order: 1,
  is_visible: true,
};

const emptyStory = {
  title: '',
  excerpt: '',
  content: '',
  image_url: '',
  video_url: '',
  document_url: '',
  is_published: false,
  published_at: '',
};

function storedUrls(value) {
  if (!value) return [];
  if (!value.startsWith('[')) return [value];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [value];
  }
}

function AdminPage() {
  const [session, setSession] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [authError, setAuthError] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [signingIn, setSigningIn] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('solutions');
  const [solutions, setSolutions] = React.useState([]);
  const [members, setMembers] = React.useState([]);
  const [stories, setStories] = React.useState([]);
  const [conversations, setConversations] = React.useState([]);
  const [selectedConversation, setSelectedConversation] = React.useState(null);
  const [conversationMessages, setConversationMessages] = React.useState([]);
  const [reply, setReply] = React.useState('');
  const [editingSolution, setEditingSolution] = React.useState(null);
  const [editingMember, setEditingMember] = React.useState(null);
  const [editingStory, setEditingStory] = React.useState(null);
  const [message, setMessage] = React.useState('');
  const [error, setError] = React.useState('');
  const previousAttentionCount = React.useRef(0);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  React.useEffect(() => {
    if (session) loadData();
  }, [session]);

  React.useEffect(() => {
    if (!session) return undefined;
    const interval = window.setInterval(() => loadData(), 10000);
    return () => window.clearInterval(interval);
  }, [session]);

  async function loadData() {
    setError('');
    const [solutionsResult, membersResult, storiesResult, conversationsResult] = await Promise.all([
      supabase.from('solutions').select('*').order('display_order'),
      supabase.from('team_members').select('*').order('display_order'),
      supabase.from('stories').select('*').order('created_at', { ascending: false }),
      supabase.from('conversations').select('*').order('updated_at', { ascending: false }),
    ]);
    if (solutionsResult.error || membersResult.error || storiesResult.error || conversationsResult.error) {
      setError(solutionsResult.error?.message || membersResult.error?.message || storiesResult.error?.message || conversationsResult.error?.message || 'Unable to load admin data.');
      return;
    }
    setSolutions(solutionsResult.data || []);
    setMembers(membersResult.data || []);
    setStories(storiesResult.data || []);
    setConversations(conversationsResult.data || []);
    const attentionCount = (conversationsResult.data || []).filter((conversation) => conversation.needs_attention).length;
    if (attentionCount > previousAttentionCount.current && previousAttentionCount.current > 0 && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('New audience message', { body: 'Someone is waiting to communicate with Rwanda Smart Systems.' });
    }
    previousAttentionCount.current = attentionCount;
  }

  async function loadConversationMessages(conversation) {
    setSelectedConversation(conversation);
    const { data, error: messagesError } = await supabase
      .from('conversation_messages')
      .select('*')
      .eq('conversation_id', conversation.id)
      .order('created_at');
    if (messagesError) {
      setError(messagesError.message);
      return;
    }
    setConversationMessages(data || []);
    if (conversation.needs_attention) {
      await supabase.from('conversations').update({ needs_attention: false }).eq('id', conversation.id);
      setConversations((current) => current.map((item) => item.id === conversation.id ? { ...item, needs_attention: false } : item));
      setSelectedConversation({ ...conversation, needs_attention: false });
    }
  }

  async function sendAdminReply(event) {
    event.preventDefault();
    const body = reply.trim();
    if (!selectedConversation || !body) return;
    const { error: replyError } = await supabase.from('conversation_messages').insert({
      conversation_id: selectedConversation.id,
      sender_type: 'admin',
      body,
    });
    if (replyError) {
      setError(replyError.message);
      return;
    }
    await supabase.from('conversations').update({ updated_at: new Date().toISOString(), needs_attention: false }).eq('id', selectedConversation.id);
    setReply('');
    await loadConversationMessages(selectedConversation);
    await loadData();
  }

  async function signIn(event) {
    event.preventDefault();
    setAuthError('');
    setSigningIn(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (signInError) {
      const message = signInError.message.toLowerCase();
      setAuthError(message.includes('email not confirmed')
        ? 'Please confirm your email address before signing in.'
        : message.includes('invalid login credentials')
          ? 'Invalid email or password.'
          : 'Unable to sign in right now. Please try again.');
    }
    setSigningIn(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function enableAlerts() {
    if ('Notification' in window) await Notification.requestPermission();
  }

  async function saveSolution(event) {
    event.preventDefault();
    setError('');
    const payload = { ...editingSolution, display_order: Number(editingSolution.display_order) };
    const result = payload.id
      ? await supabase.from('solutions').update(payload).eq('id', payload.id)
      : await supabase.from('solutions').insert(payload);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setMessage('Solution saved.');
    setEditingSolution(null);
    await loadData();
  }

  async function saveMember(event) {
    event.preventDefault();
    setError('');
    const payload = { ...editingMember, display_order: Number(editingMember.display_order) };
    const result = payload.id
      ? await supabase.from('team_members').update(payload).eq('id', payload.id)
      : await supabase.from('team_members').insert(payload);
    if (result.error) {
      setError(result.error.message);
      return;
    }

    setMessage('Team member saved.');
    setEditingMember(null);
    await loadData();
  }

  async function uploadSolutionImage(files) {
    const file = Array.from(files || [])[0];
    if (!file) return;
    if (file.size === 0) {
      setError('The selected image is empty. Please choose another image and retry.');
      return;
    }

    const path = `solutions/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`;
    const { error: uploadError } = await supabase.storage.from('story-files').upload(path, file, {
      cacheControl: '3600',
      contentType: file.type || 'image/*',
      upsert: false,
    });
    if (uploadError) {
      setError(uploadError.message);
      return;
    }

    const { data: uploadedFile, error: verificationError } = await supabase.storage.from('story-files').download(path);
    if (verificationError || !uploadedFile || uploadedFile.size === 0) {
      await supabase.storage.from('story-files').remove([path]);
      setError(verificationError?.message || 'The uploaded image is empty. Please choose another image and retry.');
      return;
    }

    const { data } = supabase.storage.from('story-files').getPublicUrl(path);
    setEditingSolution((current) => ({ ...current, image_url: data.publicUrl }));
    setMessage('Solution image uploaded.');
  }

  async function uploadMemberImage(files) {
    const file = Array.from(files || [])[0];
    if (!file || file.size === 0) {
      if (file) setError('The selected image is empty. Please choose another image and retry.');
      return;
    }
    const path = `team/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`;
    const { error: uploadError } = await supabase.storage.from('story-files').upload(path, file, {
      cacheControl: '3600',
      contentType: file.type || 'image/*',
      upsert: false,
    });
    if (uploadError) {
      setError(uploadError.message);
      return;
    }
    const { data: uploadedFile, error: verificationError } = await supabase.storage.from('story-files').download(path);
    if (verificationError || !uploadedFile || uploadedFile.size === 0) {
      await supabase.storage.from('story-files').remove([path]);
      setError(verificationError?.message || 'The uploaded image is empty. Please choose another image and retry.');
      return;
    }
    const { data } = supabase.storage.from('story-files').getPublicUrl(path);
    setEditingMember((current) => ({ ...current, image_url: data.publicUrl }));
    setMessage('Team picture uploaded.');
  }

  async function uploadStoryFile(files, field) {
    const selectedFiles = Array.from(files || []);
    if (!selectedFiles.length) return;
    if (selectedFiles.some((file) => file.size === 0)) {
      setError('One of the selected files is empty. Please choose the files again and retry.');
      return;
    }

    const uploadedUrls = [];
    for (const file of selectedFiles) {
      const path = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`;
      const { error: uploadError } = await supabase.storage.from('story-files').upload(path, file, {
        cacheControl: '3600',
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });
      if (uploadError) {
        setError(uploadError.message);
        return;
      }
      const { data: uploadedFile, error: verificationError } = await supabase.storage.from('story-files').download(path);
      if (verificationError || !uploadedFile || uploadedFile.size === 0) {
        await supabase.storage.from('story-files').remove([path]);
        setError(verificationError?.message || 'An uploaded file is empty. Please choose the files again and retry.');
        return;
      }
      const { data } = supabase.storage.from('story-files').getPublicUrl(path);
      uploadedUrls.push(data.publicUrl);
    }

    setEditingStory((current) => {
      const previousUrls = storedUrls(current[field]);
      return { ...current, [field]: JSON.stringify([...previousUrls, ...uploadedUrls]) };
    });
    setMessage(`${uploadedUrls.length} ${field.replace('_url', '')} file${uploadedUrls.length === 1 ? '' : 's'} uploaded.`);
  }

  async function saveStory(event) {
    event.preventDefault();
    setError('');
    const payload = { ...editingStory, published_at: editingStory.is_published ? (editingStory.published_at || new Date().toISOString()) : null };
    const result = payload.id
      ? await supabase.from('stories').update(payload).eq('id', payload.id)
      : await supabase.from('stories').insert(payload);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setMessage('Story saved.');
    setEditingStory(null);
    await loadData();
  }

  async function remove(table, id) {
    if (!window.confirm('Delete this item?')) return;
    setError('');
    setMessage('');
    let story = null;
    let solution = null;
    if (table === 'stories') {
      story = stories.find((item) => item.id === id);
    }
    if (table === 'solutions') {
      solution = solutions.find((item) => item.id === id);
    }

    const { data: deletedRows, error: deleteError } = await supabase
      .from(table)
      .delete()
      .eq('id', id)
      .select('id');
    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    if (!deletedRows?.length) {
      setError('The item was not deleted. Your admin account may not have permission to delete this record.');
      return;
    }

    if (story) {
      const filePaths = [story.image_url, story.video_url, story.document_url]
        .filter(Boolean)
        .flatMap(storedUrls)
        .map((url) => url.match(/\/storage\/v1\/object\/public\/story-files\/(.+)$/)?.[1])
        .filter(Boolean);
      if (filePaths.length) {
        const { error: storageError } = await supabase.storage.from('story-files').remove(filePaths);
        if (storageError) {
          setError(`Story deleted, but its uploaded files could not be removed: ${storageError.message}`);
          await loadData();
          return;
        }
      }
      if (solution?.image_url) {
        const filePath = solution.image_url.match(/\/storage\/v1\/object\/public\/story-files\/(.+)$/)?.[1];
        if (filePath) {
          const { error: storageError } = await supabase.storage.from('story-files').remove([filePath]);
          if (storageError) {
            setError(`Solution deleted, but its image could not be removed: ${storageError.message}`);
            await loadData();
            return;
          }
        }
      }
    }

    setMessage('Item deleted.');
    await loadData();
  }

  if (loading) return <div className="admin-loading">Loading admin area…</div>;
  if (!session) {
    return (
      <main className="admin-auth">
        <a className="admin-back-link" href="/"><ArrowLeft size={16} /> Back to website</a>
        <form className="auth-card" onSubmit={signIn}>
          <p className="admin-eyebrow">Rwanda Smart Systems</p>
          <h1>Admin <span>sign in.</span></h1>
          <p>Manage website content securely from one place.</p>
          <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          {authError && <div className="admin-error">{authError}</div>}
          <button className="admin-primary-button" type="submit" disabled={signingIn}>{signingIn ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div><p className="admin-eyebrow">Rwanda Smart Systems</p><h1>Content <span>studio.</span></h1></div>
        <div className="admin-header-actions"><a href="/"><ArrowLeft size={16} /> Website</a><button onClick={enableAlerts}><MessageCircle size={16} /> Enable alerts</button><button onClick={signOut}><LogOut size={16} /> Sign out</button></div>
      </header>
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <button className={activeTab === 'solutions' ? 'active' : ''} onClick={() => setActiveTab('solutions')}><Waves size={17} /> Solutions</button>
          <button className={activeTab === 'team' ? 'active' : ''} onClick={() => setActiveTab('team')}><Users size={17} /> Our Team</button>
          <button className={activeTab === 'stories' ? 'active' : ''} onClick={() => setActiveTab('stories')}><FileText size={17} /> Stories</button>
          <button className={activeTab === 'conversations' ? 'active' : ''} onClick={() => setActiveTab('conversations')}><MessageCircle size={17} /> Conversations {conversations.some((conversation) => conversation.needs_attention) && <b className="conversation-alert">!</b>}</button>
        </aside>
        <section className="admin-content">
          {message && <div className="admin-success">{message}</div>}
          {error && <div className="admin-error">{error}</div>}
          {activeTab === 'solutions' ? (
            <>
              <div className="admin-title-row"><div><p className="admin-eyebrow">Website content</p><h2>Solutions</h2></div><button className="admin-primary-button" onClick={() => setEditingSolution({ ...emptySolution, number: String(solutions.length + 1).padStart(2, '0'), display_order: solutions.length + 1 })}><Plus size={17} /> Add solution</button></div>
              <div className="admin-list">{solutions.map((solution) => <article className="admin-list-item" key={solution.id}><div><strong>{solution.title}</strong><span>{solution.menu_subtitle}</span></div><div className="admin-item-actions"><small>{solution.is_published ? 'Published' : 'Hidden'}</small><button onClick={() => setEditingSolution(solution)}>Edit</button><button className="danger" onClick={() => remove('solutions', solution.id)}><Trash2 size={15} /></button></div></article>)}</div>
              {editingSolution && <SolutionForm value={editingSolution} onChange={setEditingSolution} onUpload={uploadSolutionImage} onSubmit={saveSolution} onCancel={() => setEditingSolution(null)} />}
            </>
          ) : activeTab === 'team' ? (
            <>
              <div className="admin-title-row"><div><p className="admin-eyebrow">Website content</p><h2>Our Team</h2></div><button className="admin-primary-button" onClick={() => setEditingMember({ ...emptyMember, display_order: members.length + 1 })}><Plus size={17} /> Add member</button></div>
              <div className="admin-list">{members.map((member) => <article className="admin-list-item" key={member.id}><div><strong>{member.name}</strong><span>{member.role} · {member.email}</span></div><div className="admin-item-actions"><small>{member.is_visible ? 'Visible' : 'Hidden'}</small><button onClick={() => setEditingMember(member)}>Edit</button><button className="danger" onClick={() => remove('team_members', member.id)}><Trash2 size={15} /></button></div></article>)}</div>
              {editingMember && <MemberForm value={editingMember} onChange={setEditingMember} onUpload={uploadMemberImage} onSubmit={saveMember} onCancel={() => setEditingMember(null)} />}
            </>
          ) : activeTab === 'stories' ? (
            <>
              <div className="admin-title-row"><div><p className="admin-eyebrow">Public updates</p><h2>Stories</h2></div><button className="admin-primary-button" onClick={() => setEditingStory({ ...emptyStory })}><Plus size={17} /> Add story</button></div>
              <div className="admin-list">{stories.map((story) => <article className="admin-list-item" key={story.id}><div><strong>{story.title}</strong><span>{story.excerpt}</span></div><div className="admin-item-actions"><small>{story.is_published ? 'Published' : 'Draft'}</small><button onClick={() => setEditingStory(story)}>Edit</button><button className="danger" onClick={() => remove('stories', story.id)}><Trash2 size={15} /></button></div></article>)}</div>
              {editingStory && <StoryForm value={editingStory} onChange={setEditingStory} onUpload={uploadStoryFile} onSubmit={saveStory} onCancel={() => setEditingStory(null)} />}
            </>
          ) : (
            <>
              <div className="admin-title-row"><div><p className="admin-eyebrow">Audience inbox</p><h2>Conversations</h2></div></div>
              <div className="conversation-layout">
                <div className="admin-list conversation-list">
                  {conversations.length === 0 && <p className="admin-empty">No audience conversations yet.</p>}
                  {conversations.map((conversation) => (
                    <button className={selectedConversation?.id === conversation.id ? 'conversation-item active' : 'conversation-item'} key={conversation.id} onClick={() => loadConversationMessages(conversation)}>
                      <strong>{conversation.visitor_name}</strong>
                      <span>{conversation.visitor_email || 'No email provided'}</span>
                      <small>{conversation.needs_attention ? 'Needs reply · ' : ''}{conversation.status} · {new Date(conversation.updated_at).toLocaleString()}</small>
                    </button>
                  ))}
                </div>
                {selectedConversation ? (
                  <div className="conversation-panel">
                    <div className="conversation-heading"><div><h3>{selectedConversation.visitor_name}</h3><p>{selectedConversation.visitor_email || 'No email provided'}</p></div><span>{selectedConversation.status}</span></div>
                    <div className="conversation-messages">{conversationMessages.map((item) => <div className={`conversation-message ${item.sender_type}`} key={item.id}><p>{item.body}</p><small>{new Date(item.created_at).toLocaleString()}</small></div>)}</div>
                    <form className="conversation-reply" onSubmit={sendAdminReply}><textarea value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Write a reply to the audience member…" required /><button className="admin-primary-button" type="submit"><Send size={16} /> Reply</button></form>
                  </div>
                ) : <div className="conversation-panel conversation-empty">Select a conversation to reply.</div>}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function Field({ label, value, onChange, multiline = false }) {
  const Input = multiline ? 'textarea' : 'input';
  return <label>{label}<Input value={value ?? ''} onChange={(event) => onChange(event.target.value)} required /></label>;
}

function SolutionForm({ value, onChange, onUpload, onSubmit, onCancel }) {
  const update = (key, nextValue) => onChange({ ...value, [key]: nextValue });
  return <form className="admin-form" onSubmit={onSubmit}><div className="form-heading"><h3>{value.id ? 'Edit solution' : 'New solution'}</h3><button type="button" onClick={onCancel}>Close</button></div><div className="form-grid"><Field label="Short title" value={value.title} onChange={(v) => update('title', v)} /><Field label="Menu title" value={value.menu_title} onChange={(v) => update('menu_title', v)} /><Field label="Menu subtitle" value={value.menu_subtitle} onChange={(v) => update('menu_subtitle', v)} /><Field label="Color (orange, blue, green)" value={value.color} onChange={(v) => update('color', v)} /><Field label="Menu details" value={value.details} onChange={(v) => update('details', v)} multiline /><Field label="Card description" value={value.description} onChange={(v) => update('description', v)} multiline /><Field label="Solution login/link URL (optional)" value={value.solution_link} onChange={(v) => update('solution_link', v)} /><Field label="Button label" value={value.solution_link_label} onChange={(v) => update('solution_link_label', v)} /></div><UploadField label="Solution picture (optional)" accept="image/*" onChange={onUpload} url={value.image_url} /><label className="checkbox"><input type="checkbox" checked={value.is_published} onChange={(event) => update('is_published', event.target.checked)} /> Published</label><button className="admin-primary-button" type="submit"><Save size={16} /> Save solution</button></form>;
}

function MemberForm({ value, onChange, onUpload, onSubmit, onCancel }) {
  const update = (key, nextValue) => onChange({ ...value, [key]: nextValue });
  return <form className="admin-form" onSubmit={onSubmit}><div className="form-heading"><h3>{value.id ? 'Edit team member' : 'New team member'}</h3><button type="button" onClick={onCancel}>Close</button></div><div className="form-grid"><Field label="Name" value={value.name} onChange={(v) => update('name', v)} /><Field label="Role" value={value.role} onChange={(v) => update('role', v)} /><Field label="Email" value={value.email} onChange={(v) => update('email', v)} /><Field label="Description" value={value.description} onChange={(v) => update('description', v)} multiline /></div><UploadField label="Team picture (optional)" accept="image/*" onChange={onUpload} url={value.image_url} /><label className="checkbox"><input type="checkbox" checked={value.is_visible} onChange={(event) => update('is_visible', event.target.checked)} /> Visible on website</label><button className="admin-primary-button" type="submit"><Save size={16} /> Save member</button></form>;
}

function StoryForm({ value, onChange, onUpload, onSubmit, onCancel }) {
  const update = (key, nextValue) => onChange({ ...value, [key]: nextValue });
  return <form className="admin-form" onSubmit={onSubmit}><div className="form-heading"><h3>{value.id ? 'Edit story' : 'New story'}</h3><button type="button" onClick={onCancel}>Close</button></div><div className="form-grid"><Field label="Title" value={value.title} onChange={(v) => update('title', v)} /><Field label="Short description" value={value.excerpt} onChange={(v) => update('excerpt', v)} /><Field label="Story content" value={value.content} onChange={(v) => update('content', v)} multiline /><Field label="Video URL (optional)" value={value.video_url} onChange={(v) => update('video_url', v)} /></div><div className="upload-grid"><UploadField label="Story images (select multiple)" accept="image/*" multiple onChange={(files) => onUpload(files, 'image_url')} url={value.image_url} /><UploadField label="Video file (optional)" accept="video/*" onChange={(files) => onUpload(files, 'video_url')} url={value.video_url} /><UploadField label="Documents (select multiple)" accept=".pdf,.doc,.docx,.ppt,.pptx" multiple onChange={(files) => onUpload(files, 'document_url')} url={value.document_url} /></div><label className="checkbox"><input type="checkbox" checked={value.is_published} onChange={(event) => update('is_published', event.target.checked)} /> Publish for the public</label><button className="admin-primary-button" type="submit"><Save size={16} /> Save story</button></form>;
}

function UploadField({ label, accept, multiple = false, onChange, url }) {
  const count = storedUrls(url).length;
  return <label className="upload-field">{label}<input type="file" accept={accept} multiple={multiple} onChange={(event) => onChange(event.target.files)} />{count > 0 && <span>{count} file{count === 1 ? '' : 's'} uploaded</span>}</label>;
}

export default AdminPage;

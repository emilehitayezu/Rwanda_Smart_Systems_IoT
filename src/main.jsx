import React from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowUpRight, ChevronDown, Menu, X } from 'lucide-react';
import { supabase } from './lib/supabase';
import AdminPage from './Admin';
import './styles.css';

const services = [
  {
    number: '01',
    title: 'Aquaculture monitoring',
    menuTitle: 'Aquaculture Monitoring Systems',
    menuSubtitle: 'Using IoT, AI and Data Analytics',
    details: 'Real-time water-quality monitoring and intelligent analytics for healthier, more productive fish farming.',
    text: 'Connected water-quality monitoring, intelligent insights, and data-driven tools for healthier, more productive aquaculture.',
    color: 'orange',
  },
  {
    number: '02',
    title: 'Connected communities',
    menuTitle: 'Connected Communities',
    menuSubtitle: 'Digital infrastructure for local impact',
    details: 'Practical digital infrastructure that connects people, places, and essential services.',
    text: 'Digital infrastructure that brings people, places, and essential services closer together.',
    color: 'blue',
  },
  {
    number: '03',
    title: 'Future-ready skills',
    menuTitle: 'Future-ready Skills',
    menuSubtitle: 'Learning for local innovation',
    details: 'Hands-on learning that gives local innovators the confidence to build useful technology.',
    text: 'Hands-on learning and local innovation for the builders of tomorrow.',
    color: 'green',
  },
];

const team = [
  {
    role: 'Principal Investigator',
    name: 'Eng. NGABO Desire',
    email: 'ngabo.desire@rwandasmart.org',
  },
  {
    role: 'Hardware Engineer & Safety Engineer',
    name: 'Mr KACHOKOLA Enock',
    email: 'enock.kachokola@rwandasmart.org',
  },
  {
    role: 'Data & AI Engineer',
    name: 'Mr ASIFIWE Emmanuel',
    email: 'a.asifiwe@rwandasmart.org',
  },
  {
    role: 'CAD & 3D Designer',
    name: 'Mr IZESA JABO Epiphane',
    email: 'i.jabo@rwandasmart.org',
  },
  {
    role: 'Platform Developer & Quality Assurance',
    name: 'Mr HITAYEZU Emile',
    email: 'ehitayezu@rwandasmart.org',
  },
];

function mediaUrls(value) {
  if (!value) return [];
  if (!value.startsWith('[')) return [value];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function Logo() {
  return (
    <a className="logo" href="#top" aria-label="Rwanda Smart Systems home">
      <span className="logo-mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span className="logo-type">rwanda<span>smart</span></span>
      <span className="logo-dot">•</span>
      <span className="logo-systems">systems</span>
    </a>
  );
}

function App() {
  const [contentServices, setContentServices] = React.useState(services);
  const [contentTeam, setContentTeam] = React.useState(team);
  const [stories, setStories] = React.useState([]);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [solutionsOpen, setSolutionsOpen] = React.useState(false);
  const [selectedSolution, setSelectedSolution] = React.useState(null);
  const [aboutOpen, setAboutOpen] = React.useState(false);
  const [teamWindowOpen, setTeamWindowOpen] = React.useState(false);
  const [documentViewer, setDocumentViewer] = React.useState(null);
  const [documentLoading, setDocumentLoading] = React.useState(false);
  const [documentError, setDocumentError] = React.useState('');
  const documentLoadTimeout = React.useRef(null);

  React.useEffect(() => {
    function closeDocumentViewer(event) {
      if (event.key === 'Escape') setDocumentViewer(null);
    }
    window.addEventListener('keydown', closeDocumentViewer);
    return () => window.removeEventListener('keydown', closeDocumentViewer);
  }, []);

  React.useEffect(() => {
    if (!documentViewer) {
      setDocumentError('');
      return undefined;
    }

    setDocumentLoading(true);
    setDocumentError('');
    documentLoadTimeout.current = window.setTimeout(() => {
      setDocumentLoading(false);
      setDocumentError('The document is taking too long to load. Please check the file and try again.');
    }, 15000);
    return () => {
      if (documentLoadTimeout.current) window.clearTimeout(documentLoadTimeout.current);
    };
  }, [documentViewer]);

  React.useEffect(() => {
    let isMounted = true;

    async function loadContent() {
      const [solutionsResult, teamResult] = await Promise.all([
        supabase.from('solutions').select('number,title,menu_title,menu_subtitle,details,description,color').eq('is_published', true).order('display_order'),
        supabase.from('team_members').select('role,name,email').eq('is_visible', true).order('display_order'),
      ]);
      const storiesResult = await supabase.from('stories').select('id,title,excerpt,content,image_url,video_url,document_url,published_at').eq('is_published', true).order('published_at', { ascending: false });

      if (solutionsResult.error) {
        console.error('Unable to load solutions from Supabase:', solutionsResult.error);
      } else if (solutionsResult.data?.length && isMounted) {
        setContentServices(solutionsResult.data.map((solution) => ({
          number: solution.number,
          title: solution.title,
          menuTitle: solution.menu_title,
          menuSubtitle: solution.menu_subtitle,
          details: solution.details,
          text: solution.description,
          color: solution.color,
        })));
      }

      if (teamResult.error) {
        console.error('Unable to load team members from Supabase:', teamResult.error);
      } else if (teamResult.data?.length && isMounted) {
        setContentTeam(teamResult.data);
      }
      if (storiesResult.error) {
        console.error('Unable to load stories from Supabase:', storiesResult.error);
      } else if (storiesResult.data && isMounted) {
        setStories(storiesResult.data);
      }
    }

    loadContent();
    return () => { isMounted = false; };
  }, []);

  return (
    <div className="site-shell" id="top">
      <header className="site-header">
        <div className="container header-inner">
          <Logo />
          <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            {menuOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
          <nav className={menuOpen ? 'main-nav open' : 'main-nav'} aria-label="Main navigation">
            <div className={solutionsOpen ? 'nav-dropdown active' : 'nav-dropdown'}>
              <button
                className="nav-dropdown-trigger"
                onClick={() => setSolutionsOpen(!solutionsOpen)}
                aria-expanded={solutionsOpen}
              >
                Solutions <ChevronDown size={14} />
              </button>
              <div className="dropdown-panel">
                <p className="dropdown-label">Our solutions</p>
                {contentServices.map((solution, index) => (
                  <div className={selectedSolution === index ? 'dropdown-solution selected' : 'dropdown-solution'} key={solution.number}>
                    <button
                      className="dropdown-solution-trigger"
                      onClick={() => setSelectedSolution(selectedSolution === index ? null : index)}
                      aria-expanded={selectedSolution === index}
                    >
                      <span>
                        <strong>{solution.menuTitle}</strong>
                        <span>{solution.menuSubtitle}</span>
                      </span>
                      <ChevronDown size={15} />
                    </button>
                    {selectedSolution === index && (
                      <p className="dropdown-details">{solution.details}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <a href="#impact" onClick={() => setMenuOpen(false)}>Our impact</a>
            <a href="#solutions" onClick={() => setMenuOpen(false)}>Learning</a>
            <div className={aboutOpen ? 'nav-dropdown active' : 'nav-dropdown'}>
              <button
                className="nav-dropdown-trigger"
                onClick={() => setAboutOpen(!aboutOpen)}
                aria-expanded={aboutOpen}
              >
                About us <ChevronDown size={14} />
              </button>
              <div className="dropdown-panel about-panel">
                <a href="#about" onClick={() => { setAboutOpen(false); setMenuOpen(false); }}>
                  <strong>Our purpose</strong>
                  <span>Technology for a smarter world</span>
                </a>
                <div className="dropdown-solution">
                  <button
                    className="dropdown-solution-trigger"
                    onClick={() => setTeamWindowOpen(true)}
                  >
                    <span>
                      <strong>Our Team</strong>
                      <span>Meet the people behind the possibility</span>
                    </span>
                    <ArrowUpRight size={15} />
                  </button>
                </div>
              </div>
            </div>
            <a className="admin-link" href="/admin">Admin login</a>
            <a className="nav-cta" href="#contact" onClick={() => setMenuOpen(false)}>Go to platform <ArrowUpRight size={18} /></a>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-grid" />
          <div className="container hero-content">
            <div className="hero-copy">
              <p className="eyebrow"><span className="eyebrow-line" /> Technology for the people</p>
              <h1>Building a <em>smarter</em> World.</h1>
              <p className="hero-description">
                We connect ideas, people, and technology to create a more resilient, sustainable, and prosperous future.
              </p>
              <div className="hero-actions">
                <a className="button button-primary" href="#solutions">Explore our solutions <ArrowUpRight size={18} /></a>
                <a className="text-link" href="#about">Discover our story <span>↗</span></a>
              </div>
            </div>
            <div className="hero-art" aria-label="Illustration of connected smart systems">
              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />
              <div className="iot-image-card">
                <img
                  src="https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=640&q=85"
                  alt="Electronic circuit board representing IoT hardware"
                />
                <div className="iot-image-caption">
                  <span>AI</span>
                  <span>IoT</span>
                  <span>DATA</span>
                </div>
              </div>
              <div className="orbital-label label-top">CONNECTED<br /><strong>COMMUNITIES</strong></div>
              <div className="orbital-label label-right">LOCAL<br /><strong>INNOVATION</strong></div>
              <div className="orbital-label label-bottom">SMART<br /><strong>AGRICULTURE</strong></div>
              <div className="globe">
                <div className="globe-lines" />
                <span className="pin pin-one" />
                <span className="pin pin-two" />
                <span className="pin pin-three" />
                <span className="pin pin-four" />
              </div>
              <div className="hero-badge"><span>RW</span> Made for Rwanda</div>
            </div>
          </div>
          <div className="hero-footer">
            <div className="container hero-footer-inner">
              <span>Scroll to explore</span>
              <span className="scroll-line" />
              <span className="hero-stat"><strong>01</strong> / 03</span>
            </div>
          </div>
          <div className="wave" />
        </section>

        <section className="intro section-padding" id="about">
          <div className="container intro-grid">
            <div>
              <p className="section-kicker">Our purpose</p>
              <h2>Progress starts with <span>possibility.</span></h2>
            </div>
            <div className="intro-copy">
              <p>Rwanda Smart Systems is a home for practical innovation. We make complex technology useful, accessible, and impactful  from the farm to the city.</p>
              <a className="text-link dark-link" href="#impact">More about us <span>↗</span></a>
            </div>
          </div>
        </section>

        <section className="solutions section-padding" id="solutions">
          <div className="container">
            <div className="section-heading">
              <div>
                <p className="section-kicker">What we do</p>
                <h2>Ideas into <span>impact.</span></h2>
              </div>
              <p className="section-heading-copy">From first spark to lasting change, we design technology around the realities of Rwanda.</p>
            </div>
            <div className="service-grid">
              {contentServices.map((service) => (
                <article className={`service-card ${service.color}`} key={service.number}>
                  <div className="service-top"><span>{service.number}</span><ArrowUpRight size={21} /></div>
                  <div>
                    <h3>{service.title}</h3>
                    <p>{service.text}</p>
                  </div>
                  <div className="card-decoration" />
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="impact section-padding" id="impact">
          <div className="container impact-inner">
            <p className="section-kicker">The bigger picture</p>
            <h2>Local roots.<br /><span>Global ambition.</span></h2>
            <div className="impact-bottom">
              <p>We believe the best solutions are built with the people who use them. Together, we are shaping a more connected tomorrow.</p>
              <div className="impact-number">∞<small>possibilities</small></div>
            </div>
          </div>
        </section>

        {stories.length > 0 && (
          <section className="stories section-padding" id="stories">
            <div className="container">
              <div className="section-heading">
                <div><p className="section-kicker">Stories &amp; updates</p><h2>From the <span>field.</span></h2></div>
                <p className="section-heading-copy">Discover our latest work, ideas, and progress in AI, IoT, and data analytics.</p>
              </div>
              <div className="story-grid">
                {stories.map((story) => (
                  <article className="story-card" key={story.id}>
                    {mediaUrls(story.image_url).length > 0 && (
                      <div className="story-media-group">
                        <p className="story-media-label">Images</p>
                        <div className="story-image-grid">
                          {mediaUrls(story.image_url).map((imageUrl) => <img key={imageUrl} src={imageUrl} alt="" />)}
                        </div>
                      </div>
                    )}
                    {mediaUrls(story.video_url).length > 0 && (
                      <div className="story-media-group">
                        <p className="story-media-label">Video</p>
                        {mediaUrls(story.video_url).map((videoUrl) => (
                          <video className="story-video" controls preload="metadata" key={videoUrl}>
                            <source src={videoUrl} type="video/mp4" />
                            Your browser does not support video playback.
                          </video>
                        ))}
                      </div>
                    )}
                    <div className="story-card-body">
                      <p className="story-date">{story.published_at ? new Date(story.published_at).toLocaleDateString() : 'Rwanda Smart Systems'}</p>
                      <h3>{story.title}</h3>
                      <p>{story.excerpt}</p>
                      {mediaUrls(story.document_url).length > 0 && (
                        <div className="story-document-list">
                          <p className="story-media-label">Documents</p>
                          {mediaUrls(story.document_url).map((documentUrl, index) => (
                        <button
                          key={documentUrl}
                          className="story-media-button"
                          type="button"
                          onClick={() => setDocumentViewer({ title: `${story.title} — Document ${index + 1}`, url: documentUrl })}
                        >
                          View document {index + 1}
                        </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="contact section-padding" id="contact">
          <div className="container contact-inner">
            <p className="section-kicker">Let&apos;s build together</p>
            <h2>Have an idea?<br /><span>Let&apos;s make it real.</span></h2>
            <p className="contact-location">University of Rwanda, College of Science and Technology<br />African Center of Excellence in Internet of Things</p>
            <a className="button button-primary" href="mailto:hello@rwandasmartsystems.rw">Start a conversation <ArrowUpRight size={18} /></a>
          </div>
        </section>
      </main>

      {teamWindowOpen && (
        <div className="team-window-backdrop" role="presentation" onClick={() => setTeamWindowOpen(false)}>
          <section className="team-window" role="dialog" aria-modal="true" aria-labelledby="team-window-title" onClick={(event) => event.stopPropagation()}>
            <button className="team-window-close" onClick={() => setTeamWindowOpen(false)} aria-label="Close Our Team window">
              <X size={20} />
            </button>
            <p className="section-kicker">About us</p>
            <h2 id="team-window-title">Our <span>Team</span></h2>
            <p className="team-window-intro">Meet the people building practical technology for a smarter world.</p>
            <div className="team-window-grid">
              {contentTeam.map((member) => (
                <article className="team-window-member" key={member.email}>
                  <p>{member.role}</p>
                  <h3>{member.name}</h3>
                  <a href={`mailto:${member.email}`}>{member.email}</a>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}

      {documentViewer && (
        <div className="document-viewer-backdrop" role="presentation" onClick={() => setDocumentViewer(null)}>
          <section className="document-viewer" role="dialog" aria-modal="true" aria-labelledby="document-viewer-title" onClick={(event) => event.stopPropagation()}>
            <div className="document-viewer-header">
              <h2 id="document-viewer-title">{documentViewer.title}</h2>
              <button className="team-window-close" type="button" onClick={() => setDocumentViewer(null)} aria-label="Close document viewer">
                <X size={20} />
              </button>
            </div>
            {documentLoading && <p className="document-viewer-status">Loading document…</p>}
            {documentError && <p className="document-viewer-status document-viewer-error">{documentError}</p>}
            <iframe
              className="document-frame"
              src={documentViewer.url}
              title={documentViewer.title}
              onLoad={() => {
                if (documentLoadTimeout.current) window.clearTimeout(documentLoadTimeout.current);
                setDocumentLoading(false);
                setDocumentError('');
              }}
              onError={() => {
                if (documentLoadTimeout.current) window.clearTimeout(documentLoadTimeout.current);
                setDocumentLoading(false);
                setDocumentError('Unable to display this document. Please upload a valid PDF again.');
              }}
            />
          </section>
        </div>
      )}

      <footer className="site-footer">
        <div className="container footer-inner">
          <Logo />
          <p>Technology for the people.</p>
          <p className="footer-location">University of Rwanda, College of Science and Technology<br />African Center of Excellence in Internet of Things</p>
          <a className="footer-admin-link" href="/admin">Admin login</a>
          <p className="copyright">© 2026 Rwanda Smart Systems</p>
        </div>
      </footer>
    </div>
  );
}

const isAdminRoute = window.location.pathname === '/admin' || window.location.pathname.startsWith('/admin/');
createRoot(document.getElementById('root')).render(<React.StrictMode>{isAdminRoute ? <AdminPage /> : <App />}</React.StrictMode>);

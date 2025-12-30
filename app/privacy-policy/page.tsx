'use client';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { ShieldCheckIcon, InformationCircleIcon } from '@heroicons/react/24/solid';

export default function PrivacyPolicy() {
  const sections = [
    {
      title: 'Information Collection And Use',
      content: (
        <>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>We collect several different types of information for various purposes to provide and improve our Service to you.</p>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#fbbf24', marginTop: '2.5rem', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(59, 130, 246, 0.2)' }}>Types of Data Collected</h3>
          <h4 style={{ fontSize: '1.125rem', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)', marginTop: '2rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(59, 130, 246, 0.15)' }}>Personal Data</h4>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>While using our Service, we may ask you to provide us with certain personally identifiable information that can be used to contact or identify you ("Personal Data"). Personally identifiable information may include, but is not limited to:</p>
          <ul style={{ margin: '1.25rem 0', paddingLeft: '2rem', listStyleType: 'disc', listStylePosition: 'outside' }}>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>Email address</li>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>Cookies and Usage Data</li>
          </ul>
          <h4 style={{ fontSize: '1.125rem', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)', marginTop: '2rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(59, 130, 246, 0.15)' }}>Usage Data</h4>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>We may also collect information how the Service is accessed and used ("Usage Data"). This Usage Data may include information such as your computer's Internet Protocol address (e.g. IP address), browser type, browser version, the pages of our Service that you visit, the time and date of your visit, the time spent on those pages, unique device identifiers and other diagnostic data.</p>
          <h4 style={{ fontSize: '1.125rem', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)', marginTop: '2rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(59, 130, 246, 0.15)' }}>Tracking & Cookies Data</h4>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>We use cookies and similar tracking technologies to track the activity on our Service and hold certain information.</p>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>Cookies are files with small amount of data which may include an anonymous unique identifier. Cookies are sent to your browser from a website and stored on your device. Tracking technologies also used are beacons, tags, and scripts to collect and track information and to improve and analyze our Service.</p>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our Service.</p>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}><strong style={{ fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)', marginRight: '0.25rem' }}>Examples of Cookies we use:</strong></p>
          <ul style={{ margin: '1.25rem 0', paddingLeft: '2rem', listStyleType: 'disc', listStylePosition: 'outside' }}>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}><strong>Session Cookies.</strong> We use Session Cookies to operate our Service.</li>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}><strong>Preference Cookies.</strong> We use Preference Cookies to remember your preferences and various settings.</li>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}><strong>Security Cookies.</strong> We use Security Cookies for security purposes.</li>
          </ul>
        </>
      )
    },
    {
      title: 'Use of Data',
      content: (
        <>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>Lines Police CAD uses the collected data for various purposes:</p>
          <ul style={{ margin: '1.25rem 0', paddingLeft: '2rem', listStyleType: 'disc', listStylePosition: 'outside' }}>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>To provide and maintain the Service</li>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>To notify you about changes to our Service</li>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>To allow you to participate in interactive features of our Service when you choose to do so</li>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>To provide customer care and support</li>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>To provide analysis or valuable information so that we can improve the Service</li>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>To monitor the usage of the Service</li>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>To detect, prevent and address technical issues</li>
          </ul>
        </>
      )
    },
    {
      title: 'Transfer Of Data',
      content: (
        <>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>Your information, including Personal Data, may be transferred to — and maintained on — computers located outside of your state, province, country or other governmental jurisdiction where the data protection laws may differ than those from your jurisdiction.</p>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>If you are located outside United States and choose to provide information to us, please note that we transfer the data, including Personal Data, to United States and process it there.</p>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>Your consent to this Privacy Policy followed by your submission of such information represents your agreement to that transfer.</p>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>Lines Police CAD will take all steps reasonably necessary to ensure that your data is treated securely and in accordance with this Privacy Policy and no transfer of your Personal Data will take place to an organization or a country unless there are adequate controls in place including the security of your data and other personal information.</p>
        </>
      )
    },
    {
      title: 'Disclosure Of Data',
      content: (
        <>
          <h4 style={{ fontSize: '1.125rem', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)', marginTop: '2rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(59, 130, 246, 0.15)' }}>Legal Requirements</h4>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>Lines Police CAD may disclose your Personal Data in the good faith belief that such action is necessary to:</p>
          <ul style={{ margin: '1.25rem 0', paddingLeft: '2rem', listStyleType: 'disc', listStylePosition: 'outside' }}>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>To comply with a legal obligation</li>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>To protect and defend the rights or property of Lines Police CAD</li>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>To prevent or investigate possible wrongdoing in connection with the Service</li>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>To protect the personal safety of users of the Service or the public</li>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>To protect against legal liability</li>
          </ul>
        </>
      )
    },
    {
      title: 'Security Of Data',
      content: (
        <>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>The security of your data is important to us, but remember that no method of transmission over the Internet, or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your Personal Data, we cannot guarantee its absolute security.</p>
        </>
      )
    },
    {
      title: 'Service Providers',
      content: (
        <>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>We may employ third party companies and individuals to facilitate our Service ("Service Providers"), to provide the Service on our behalf, to perform Service-related services or to assist us in analyzing how our Service is used.</p>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>These third parties have access to your Personal Data only to perform these tasks on our behalf and are obligated not to disclose or use it for any other purpose.</p>
          <h4 style={{ fontSize: '1.125rem', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)', marginTop: '2rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(59, 130, 246, 0.15)' }}>Analytics</h4>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>We may use third-party Service Providers to monitor and analyze the use of our Service.</p>
          <h4 style={{ fontSize: '1.125rem', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)', marginTop: '2rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(59, 130, 246, 0.15)' }}>Google Analytics</h4>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>Google Analytics is a web analytics service offered by Google that tracks and reports website traffic. Google uses the data collected to track and monitor the use of our Service. This data is shared with other Google services. Google may use the collected data to contextualize and personalize the ads of its own advertising network.</p>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>You can opt-out of having made your activity on the Service available to Google Analytics by installing the Google Analytics opt-out browser add-on. The add-on prevents the Google Analytics JavaScript (ga.js, analytics.js, and dc.js) from sharing information with Google Analytics about visits activity.</p>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>For more information on the privacy practices of Google, please visit the Google Privacy & Terms web page:{' '}
            <a
              href="https://policies.google.com/privacy?hl=en"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#3b82f6', textDecoration: 'underline' }}
            >
              https://policies.google.com/privacy?hl=en
            </a>
          </p>
        </>
      )
    },
    {
      title: 'Links To Other Sites',
      content: (
        <>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>Our Service may contain links to other sites that are not operated by us. If you click on a third party link, you will be directed to that third party's site. We strongly advise you to review the Privacy Policy of every site you visit.</p>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>We have no control over and assume no responsibility for the content, privacy policies or practices of any third party sites or services.</p>
        </>
      )
    },
    {
      title: "Children's Privacy",
      content: (
        <>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>Our Service does not address anyone under the age of 18 ("Children").</p>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>We do not knowingly collect personally identifiable information from anyone under the age of 18. If you are a parent or guardian and you are aware that your Children has provided us with Personal Data, please contact us. If we become aware that we have collected Personal Data from children without verification of parental consent, we take steps to remove that information from our servers.</p>
        </>
      )
    },
    {
      title: 'Changes To This Privacy Policy',
      content: (
        <>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.</p>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>We will let you know via email and/or a prominent notice on our Service, prior to the change becoming effective and update the "effective date" at the top of this Privacy Policy.</p>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.</p>
        </>
      )
    }
  ];

  return (
    <main 
      style={{
        minHeight: '100vh',
        width: '100%',
        maxWidth: '100vw',
        backgroundColor: '#0a0a0f',
        position: 'relative',
        margin: 0,
        padding: 0,
        overflowX: 'hidden',
        boxSizing: 'border-box'
      }}
    >
      {/* Background Image */}
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundImage: 'url(/static/static/images/landing-bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        zIndex: 0
      }} />
      
      {/* Dark Overlay */}
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'linear-gradient(180deg, rgba(10, 10, 15, 0.85) 0%, rgba(26, 26, 46, 0.8) 50%, rgba(22, 33, 62, 0.85) 100%)',
        zIndex: 1
      }} />

      <div style={{ position: 'relative', zIndex: 2 }}>
        <Navbar />
        
        <div style={{
          paddingTop: '2rem',
          paddingBottom: '4rem',
          minHeight: 'calc(100vh - 80px)'
        }}>
          <div style={{
            maxWidth: 'min(100%, 65rem)',
            margin: '0 auto',
            padding: '0 clamp(1rem, 4vw, 1.5rem)',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            {/* Header */}
            <div style={{
              textAlign: 'center',
              marginBottom: '3rem',
              paddingTop: '2rem'
            }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '80px',
                height: '80px',
                borderRadius: '1rem',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                marginBottom: '1.5rem',
                boxShadow: '0 0 30px rgba(59, 130, 246, 0.4)'
              }}>
                <ShieldCheckIcon style={{ width: '40px', height: '40px', color: '#ffffff' }} />
              </div>
              <h1 style={{
                fontSize: 'clamp(2.5rem, 6vw, 4rem)',
                fontWeight: '700',
                color: '#fbbf24',
                marginBottom: '0.5rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                textShadow: '0 0 20px rgba(251, 191, 36, 0.3)'
              }}>
                Privacy Policy
              </h1>
              <p style={{
                fontSize: '1rem',
                color: 'rgba(255, 255, 255, 0.6)',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
              }}>
                Effective date: December 30, 2025
              </p>
            </div>

            {/* Introduction */}
            <div style={{
              backgroundColor: 'rgba(15, 15, 20, 0.6)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: '1rem',
              padding: '2rem',
              marginBottom: '2rem'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '1rem',
                marginBottom: '1rem'
              }}>
                <InformationCircleIcon style={{ width: '24px', height: '24px', color: '#3b82f6', flexShrink: 0, marginTop: '0.25rem' }} />
                <div style={{ flex: 1 }}>
                  <p style={{
                    fontSize: '1rem',
                    color: 'rgba(255, 255, 255, 0.7)',
                    lineHeight: '1.6',
                    marginBottom: '1rem',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                  }}>
                    Lines Police CAD ("us", "we", or "our") operates the https://linespolice-cad.com/ website (the "Service").
                  </p>
                  <p style={{
                    fontSize: '1rem',
                    color: 'rgba(255, 255, 255, 0.7)',
                    lineHeight: '1.6',
                    marginBottom: '1rem',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                  }}>
                    This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service and the choices you have associated with that data. This Privacy Policy for Lines Police Server is powered by FreePrivacyPolicy.com.
                  </p>
                  <p style={{
                    fontSize: '1rem',
                    color: 'rgba(255, 255, 255, 0.7)',
                    lineHeight: '1.6',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                  }}>
                    We use your data to provide and improve the Service. By using the Service, you agree to the collection and use of information in accordance with this policy. Unless otherwise defined in this Privacy Policy, terms used in this Privacy Policy have the same meanings as in our{' '}
                    <Link
                      href="/terms-and-conditions"
                      style={{ color: '#3b82f6', textDecoration: 'underline' }}
                    >
                      Terms and Conditions
                    </Link>
                    .
                  </p>
                </div>
              </div>
            </div>

            {/* Sections */}
            {sections.map((section, index) => (
              <div key={index}>
                <div
                  style={{
                    backgroundColor: 'rgba(15, 15, 20, 0.6)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    borderRadius: '1rem',
                    padding: '2rem',
                    marginBottom: index < sections.length - 1 ? '0' : '2rem'
                  }}
                >
                  <h2 style={{
                    fontSize: '1.75rem',
                    fontWeight: '600',
                    color: '#fbbf24',
                    marginBottom: '1.5rem',
                    marginTop: 0,
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                  }}>
                    {section.title}
                  </h2>
                  <div style={{
                    fontSize: '1rem',
                    color: 'rgba(255, 255, 255, 0.7)',
                    lineHeight: '1.8',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                    textAlign: 'left',
                    padding: '0.5rem 0'
                  }}>
                    {section.content}
                  </div>
                </div>
                {index < sections.length - 1 && (
                  <div style={{
                    height: '1px',
                    background: 'linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.3), transparent)',
                    margin: '2rem 0',
                    width: '100%'
                  }} />
                )}
              </div>
            ))}

            {/* Contact Us Section */}
            <div style={{
              backgroundColor: 'rgba(15, 15, 20, 0.6)',
              border: '1px solid rgba(251, 191, 36, 0.2)',
              borderRadius: '1rem',
              padding: '2rem',
              textAlign: 'center'
            }}>
              <h2 style={{
                fontSize: '1.75rem',
                fontWeight: '600',
                color: '#fbbf24',
                marginBottom: '1rem',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
              }}>
                Contact Us
              </h2>
              <p style={{
                fontSize: '1rem',
                color: 'rgba(255, 255, 255, 0.7)',
                lineHeight: '1.6',
                marginBottom: '1rem',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
              }}>
                If you have any questions about this Privacy Policy, please contact us:
              </p>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                alignItems: 'center'
              }}>
                <p style={{
                  fontSize: '1rem',
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                }}>
                  By email: <a href="mailto:support@linespolice-cad.com" style={{ color: '#3b82f6', textDecoration: 'underline' }}>support@linespolice-cad.com</a>
                </p>
                <p style={{
                  fontSize: '1rem',
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                }}>
                  By visiting this page on our website:{' '}
                  <Link
                    href="/about-us"
                    style={{ color: '#3b82f6', textDecoration: 'underline' }}
                  >
                    About Us
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>

        <Footer />
      </div>

      <style jsx>{`
        h3 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #fbbf24;
          margin-top: 2.5rem;
          margin-bottom: 1.25rem;
          margin-left: 0;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid rgba(59, 130, 246, 0.2);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }
        h4 {
          font-size: 1.125rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
          margin-top: 2rem;
          margin-bottom: 1rem;
          margin-left: 0;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid rgba(59, 130, 246, 0.15);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }
        ul {
          margin: 1.25rem 0;
          padding-left: 2rem;
          color: rgba(255, 255, 255, 0.7);
          list-style-type: disc;
          list-style-position: outside;
        }
        li {
          margin: 0.5rem 0;
          line-height: 1.8;
          display: list-item;
          padding-left: 0.25rem;
          list-style-type: disc;
          color: rgba(255, 255, 255, 0.7);
        }
        li::marker {
          color: rgba(255, 255, 255, 0.7);
        }
        p {
          margin: 1.25rem 0;
          text-align: left;
          line-height: 1.8;
        }
        p:first-child {
          margin-top: 0;
        }
        strong {
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
          margin-right: 0.25rem;
        }
        a {
          color: #3b82f6;
          text-decoration: underline;
        }
        a:hover {
          color: #60a5fa;
        }
      `}</style>
    </main>
  );
}


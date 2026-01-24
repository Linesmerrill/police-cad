/* eslint-disable react/no-unescaped-entities */
'use client';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { DocumentTextIcon } from '@heroicons/react/24/solid';

export default function TermsAndConditions() {
  const sections = [
    {
      title: 'Welcome to Lines Police CAD!',
      content: (
        <>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)', fontWeight: '600' }}>These terms and conditions outline the rules and regulations for the use of Lines Police CAD's Website, located at https://linespolice-cad.com/.</p>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>By accessing this website we assume you accept these terms and conditions. Do not continue to use Lines Police CAD if you do not agree to take all of the terms and conditions stated on this page. Our Terms and Conditions were created with the help of the Terms And Conditions Generator.</p>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>The following terminology applies to these Terms and Conditions, Privacy Statement and Disclaimer Notice and all Agreements: "Client", "You" and "Your" refers to you, the person log on this website and compliant to the Company's terms and conditions. "The Company", "Ourselves", "We", "Our" and "Us", refers to our Company. "Party", "Parties", or "Us", refers to both the Client and ourselves. All terms refer to the offer, acceptance and consideration of payment necessary to undertake the process of our assistance to the Client in the most appropriate manner for the express purpose of meeting the Client's needs in respect of provision of the Company's stated services, in accordance with and subject to, prevailing law of Netherlands. Any use of the above terminology or other words in the singular, plural, capitalization and/or he/she or they, are taken as interchangeable and therefore as referring to same.</p>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#fbbf24', marginTop: '2.5rem', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(59, 130, 246, 0.2)' }}>Cookies</h3>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>We employ the use of cookies. By accessing Lines Police CAD, you agreed to use cookies in agreement with the Lines Police CAD's Privacy Policy.</p>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>Most interactive websites use cookies to let us retrieve the user's details for each visit. Cookies are used by our website to enable the functionality of certain areas to make it easier for people visiting our website. Some of our affiliate/advertising partners may also use cookies.</p>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#fbbf24', marginTop: '2.5rem', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(59, 130, 246, 0.2)' }}>License</h3>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>Unless otherwise stated, Lines Police CAD and/or its licensors own the intellectual property rights for all material on Lines Police CAD. All intellectual property rights are reserved. You may access this from Lines Police CAD for your own personal use subjected to restrictions set in these terms and conditions.</p>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}><strong style={{ fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)', marginRight: '0.25rem' }}>You must not:</strong></p>
          <ul style={{ margin: '1.25rem 0', paddingLeft: '2rem', listStyleType: 'disc', listStylePosition: 'outside' }}>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>Republish material from Lines Police CAD</li>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>Sell, rent or sub-license material from Lines Police CAD</li>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>Reproduce, duplicate or copy material from Lines Police CAD</li>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>Redistribute content from Lines Police CAD</li>
          </ul>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>This Agreement shall begin on the date hereof.</p>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>Parts of this website offer an opportunity for users to post and exchange opinions and information in certain areas of the website. Lines Police CAD does not filter, edit, publish or review Comments prior to their presence on the website. Comments do not reflect the views and opinions of Lines Police CAD, its agents and/or affiliates. Comments reflect the views and opinions of the person who post their views and opinions. To the extent permitted by applicable laws, Lines Police CAD shall not be liable for the Comments or for any liability, damages or expenses caused and/or suffered as a result of any use of and/or posting of and/or appearance of the Comments on this website.</p>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>Lines Police CAD reserves the right to monitor all Comments and to remove any Comments which can be considered inappropriate, offensive or causes breach of these Terms and Conditions.</p>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}><strong style={{ fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)', marginRight: '0.25rem' }}>You warrant and represent that:</strong></p>
          <ul style={{ margin: '1.25rem 0', paddingLeft: '2rem', listStyleType: 'disc', listStylePosition: 'outside' }}>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>You are entitled to post the Comments on our website and have all necessary licenses and consents to do so;</li>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>The Comments do not invade any intellectual property right, including without limitation copyright, patent or trademark of any third party;</li>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>The Comments do not contain any defamatory, libelous, offensive, indecent or otherwise unlawful material which is an invasion of privacy</li>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>The Comments will not be used to solicit or promote business or custom or present commercial activities or unlawful activity.</li>
          </ul>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>You hereby grant Lines Police CAD a non-exclusive license to use, reproduce, edit and authorize others to use, reproduce and edit any of your Comments in any and all forms, formats or media.</p>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#fbbf24', marginTop: '2.5rem', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(59, 130, 246, 0.2)' }}>Subscriptions</h3>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>Lines Police CAD offers subscription plans to enhance your experience on our platform. We provide two types of subscriptions: User Subscription Plans for individual users and Community Promotion Tiers for advertising communities. By subscribing to any plan, you agree to the following terms:</p>
          <h4 style={{ fontSize: '1.125rem', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)', marginTop: '2rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(59, 130, 246, 0.15)' }}>User Subscription Plans</h4>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>These plans enhance your personal experience on the platform:</p>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}><strong style={{ fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)', marginRight: '0.25rem' }}>Plans and Features:</strong></p>
          <ul style={{ margin: '1.25rem 0', paddingLeft: '2rem', listStyleType: 'disc', listStylePosition: 'outside' }}>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}><strong style={{ fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)', marginRight: '0.25rem' }}>Base Plan</strong> ($3/month or $2.67/month annually): Allows you to create up to 5 communities, access default departments, and experience the app with full ads.</li>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}><strong style={{ fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)', marginRight: '0.25rem' }}>Premium Plan</strong> ($8/month or $7.08/month annually): Includes a verified checkmark on your profile, the ability to create up to 10 communities, access to default departments, and a reduced ad experience with up to 50% fewer ads.</li>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}><strong style={{ fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)', marginRight: '0.25rem' }}>Premium + Plan</strong> ($19.99/month or $17.49/month annually): Provides a verified checkmark, unlimited community creation, custom departments, and an ad-free experience.</li>
          </ul>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}><strong style={{ fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)', marginRight: '0.25rem' }}>Billing and Payment:</strong></p>
          <ul style={{ margin: '1.25rem 0', paddingLeft: '2rem', listStyleType: 'disc', listStylePosition: 'outside' }}>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>User Subscription Plans are available on a monthly or annual basis. Annual plans offer a discounted rate, saving you 12% compared to the monthly billing option.</li>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>You will be charged the full amount for the selected billing period (monthly or annual) at the time of subscription.</li>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>Subscriptions auto-renew at the end of each billing period unless cancelled. You must cancel at least 24 hours prior to the next renewal to avoid additional charges.</li>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>Payments are processed securely through Stripe. You agree to provide accurate payment information and authorize Lines Police CAD to charge the applicable subscription fees.</li>
          </ul>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}><strong style={{ fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)', marginRight: '0.25rem' }}>Cancellation and Management:</strong></p>
          <ul style={{ margin: '1.25rem 0', paddingLeft: '2rem', listStyleType: 'disc', listStylePosition: 'outside' }}>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>You may cancel your User Subscription Plan at any time through the "Manage Subscription" section of the app. Upon cancellation, your subscription benefits will remain active until the end of the current billing period.</li>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>Terms may vary depending on the platform you subscribed on (e.g., iOS, Android, or web). You are responsible for managing your subscription directly with the platform provider if applicable.</li>
          </ul>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}><strong style={{ fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)', marginRight: '0.25rem' }}>User Obligations:</strong></p>
          <ul style={{ margin: '1.25rem 0', paddingLeft: '2rem', listStyleType: 'disc', listStylePosition: 'outside' }}>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>You agree not to share your User Subscription Plan benefits with other users or attempt to bypass subscription limits (e.g., creating additional accounts to exceed community creation limits).</li>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>Lines Police CAD reserves the right to suspend or terminate your subscription if we detect misuse or violation of these terms.</li>
          </ul>
          <h4 style={{ fontSize: '1.125rem', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)', marginTop: '2rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(59, 130, 246, 0.15)' }}>Community Promotion Tiers</h4>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>These tiers allow you to advertise your community on the platform:</p>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}><strong style={{ fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)', marginRight: '0.25rem' }}>Tiers and Features:</strong></p>
          <ul style={{ margin: '1.25rem 0', paddingLeft: '2rem', listStyleType: 'disc', listStylePosition: 'outside' }}>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}><strong style={{ fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)', marginRight: '0.25rem' }}>Basic Tier</strong> ($5/month): Includes promotional text in search results to help your community stand out.</li>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}><strong style={{ fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)', marginRight: '0.25rem' }}>Standard Tier</strong> ($10/month): Includes promotional text in search results and a verified community badge to build trust with potential members.</li>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}><strong style={{ fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)', marginRight: '0.25rem' }}>Premium Tier</strong> ($20/month): Includes promotional text in search results, a verified community badge, and a boost on the Discover Communities page for increased visibility.</li>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}><strong style={{ fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)', marginRight: '0.25rem' }}>Elite Tier</strong> ($50/month): Includes promotional text in search results (up to 200 characters), a verified community badge, a boost on the Discover Communities page, and a featured spot on the Home Page for maximum exposure.</li>
          </ul>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}><strong style={{ fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)', marginRight: '0.25rem' }}>Billing and Payment:</strong></p>
          <ul style={{ margin: '1.25rem 0', paddingLeft: '2rem', listStyleType: 'disc', listStylePosition: 'outside' }}>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>Community Promotion Tiers are available on a monthly basis only.</li>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>You will be charged the full monthly amount at the time of subscription.</li>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>Community Promotion Tiers auto-renew at the end of each billing period unless cancelled. You must cancel at least 24 hours prior to the next renewal to avoid additional charges.</li>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>Payments are processed securely through Stripe. You agree to provide accurate payment information and authorize Lines Police CAD to charge the applicable subscription fees.</li>
          </ul>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}><strong style={{ fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)', marginRight: '0.25rem' }}>Cancellation and Management:</strong></p>
          <ul style={{ margin: '1.25rem 0', paddingLeft: '2rem', listStyleType: 'disc', listStylePosition: 'outside' }}>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>You may cancel your Community Promotion Tier at any time through the "Manage Subscription" section of the app. Upon cancellation, your promotion benefits will remain active until the end of the current billing period.</li>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>Terms may vary depending on the platform you subscribed on (e.g., iOS, Android, or web). You are responsible for managing your subscription directly with the platform provider if applicable.</li>
          </ul>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}><strong style={{ fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)', marginRight: '0.25rem' }}>User Obligations:</strong></p>
          <ul style={{ margin: '1.25rem 0', paddingLeft: '2rem', listStyleType: 'disc', listStylePosition: 'outside' }}>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>Promotional text must comply with our content guidelines and must not contain inappropriate, offensive, or misleading information. Lines Police CAD reserves the right to reject or remove promotional text that violates these guidelines.</li>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>The verified community badge and featured placements (e.g., on the Discover Communities page or Home Page) are subject to availability and may be adjusted at Lines Police CAD's discretion.</li>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>You agree not to misuse promotion features, such as using multiple accounts to promote the same community beyond the allowed limits.</li>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>Lines Police CAD reserves the right to suspend or terminate your Community Promotion Tier if we detect misuse or violation of these terms.</li>
          </ul>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}><strong style={{ fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)', marginRight: '0.25rem' }}>Feature Descriptions:</strong></p>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>Lines Police CAD provides feature descriptions to help you understand the benefits of each subscription plan and community promotion tier. These descriptions are accessible via an information icon next to each feature in the subscription selection screen. By interacting with these icons, you acknowledge the following:</p>
          <ul style={{ margin: '1.25rem 0', paddingLeft: '2rem', listStyleType: 'disc', listStylePosition: 'outside' }}>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>Feature descriptions are provided for informational purposes only and do not constitute a guarantee of specific functionality or performance.</li>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>Lines Police CAD reserves the right to modify or discontinue features at any time, with or without notice. Any such changes will be reflected in the subscription selection screen and updated feature descriptions.</li>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>Accessing feature descriptions does not affect your subscription status or billing.</li>
          </ul>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#fbbf24', marginTop: '2.5rem', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(59, 130, 246, 0.2)' }}>Hyperlinking to our Content</h3>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>The following organizations may link to our Website without prior written approval:</p>
          <ul style={{ margin: '1.25rem 0', paddingLeft: '2rem', listStyleType: 'disc', listStylePosition: 'outside' }}>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>Government agencies;</li>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>Search engines;</li>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>News organizations;</li>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>Online directory distributors may link to our Website in the same manner as they hyperlink to the Websites of other listed businesses; and</li>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>System wide Accredited Businesses except soliciting non-profit organizations, charity shopping malls, and charity fundraising groups which may not hyperlink to our Web site.</li>
          </ul>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>These organizations may link to our home page, to publications or to other Website information so long as the link: (a) is not in any way deceptive; (b) does not falsely imply sponsorship, endorsement or approval of the linking party and its products and/or services; and (c) fits within the context of the linking party's site.</p>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>We may consider and approve other link requests from the following types of organizations:</p>
          <ul style={{ margin: '1.25rem 0', paddingLeft: '2rem', listStyleType: 'disc', listStylePosition: 'outside' }}>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>Commonly-known consumer and/or business information sources;</li>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>Dot.com community sites;</li>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>Associations or other groups representing charities;</li>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>Online directory distributors;</li>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>Internet portals;</li>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>Accounting, law and consulting firms; and</li>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>Educational institutions and trade associations.</li>
          </ul>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>We will approve link requests from these organizations if we decide that: (a) the link would not make us look unfavorably to ourselves or to our accredited businesses; (b) the organization does not have any negative records with us; (c) the benefit to us from the visibility of the hyperlink compensates the absence of Lines Police CAD; and (d) the link is in the context of general resource information.</p>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>These organizations may link to our home page so long as the link: (a) is not in any way deceptive; (b) does not falsely imply sponsorship, endorsement or approval of the linking party and its products or services; and (c) fits within the context of the linking party's site.</p>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>If you are one of the organizations listed in paragraph 2 above and are interested in linking to our website, you must inform us by sending an e-mail to Lines Police CAD. Please include your name, your organization name, contact information as well as the URL of your site, a list of any URLs from which you intend to link to our Website, and a list of the URLs on our site to which you would like to link. Wait 2-3 weeks for a response.</p>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}><strong style={{ fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)', marginRight: '0.25rem' }}>Approved organizations may hyperlink to our Website as follows:</strong></p>
          <ul style={{ margin: '1.25rem 0', paddingLeft: '2rem', listStyleType: 'disc', listStylePosition: 'outside' }}>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>By use of our corporate name; or</li>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>By use of the uniform resource locator being linked to; or</li>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>By use of any other description of our Website being linked to that makes sense within the context and format of content on the linking party's site.</li>
          </ul>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>No use of Lines Police CAD's logo or other artwork will be allowed for linking absent a trademark license agreement.</p>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#fbbf24', marginTop: '2.5rem', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(59, 130, 246, 0.2)' }}>iFrames</h3>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>Without prior approval and written permission, you may not create frames around our Webpages that alter in any way the visual presentation or appearance of our Website.</p>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#fbbf24', marginTop: '2.5rem', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(59, 130, 246, 0.2)' }}>Content Liability</h3>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>We shall not be hold responsible for any content that appears on your Website. You agree to protect and defend us against all claims that is rising on your Website. No link(s) should appear on any Website that may be interpreted as libelous, obscene or criminal, or which infringes, otherwise violates, or advocates the infringement or other violation of, any third party rights.</p>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#fbbf24', marginTop: '2.5rem', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(59, 130, 246, 0.2)' }}>Your Privacy</h3>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>Please read our <Link href="/privacy-policy" style={{ color: '#3b82f6', textDecoration: 'underline' }}>Privacy Policy</Link></p>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#fbbf24', marginTop: '2.5rem', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(59, 130, 246, 0.2)' }}>Reservation of Rights</h3>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>We reserve the right to request that you remove all links or any particular link to our Website. You approve to immediately remove all links to our Website upon request. We also reserve the right to amend these terms and conditions and it's linking policy at any time. By continuously linking to our Website, you agree to be bound to and follow these linking terms and conditions.</p>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#fbbf24', marginTop: '2.5rem', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(59, 130, 246, 0.2)' }}>Removal of links from our website</h3>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>If you find any link on our Website that is offensive for any reason, you are free to contact and inform us any moment. We will consider requests to remove links but we are not obligated to or so or to respond to you directly.</p>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>We do not ensure that the information on this website is correct, we do not warrant its completeness or accuracy; nor do we promise to ensure that the website remains available or that the material on the website is kept up to date.</p>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#fbbf24', marginTop: '2.5rem', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(59, 130, 246, 0.2)' }}>Disclaimer</h3>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>To the maximum extent permitted by applicable law, we exclude all representations, warranties and conditions relating to our website and the use of this website. Nothing in this disclaimer will:</p>
          <ul style={{ margin: '1.25rem 0', paddingLeft: '2rem', listStyleType: 'disc', listStylePosition: 'outside' }}>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>Limit or exclude our or your liability for death or personal injury;</li>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>Limit or exclude our or your liability for fraud or fraudulent misrepresentation;</li>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>Limit any of our or your liabilities in any way that is not permitted under applicable law; or</li>
            <li style={{ margin: '0.5rem 0', lineHeight: '1.8', display: 'list-item', color: 'rgba(255, 255, 255, 0.7)' }}>Exclude any of our or your liabilities that may not be excluded under applicable law.</li>
          </ul>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>The limitations and prohibitions of liability set in this Section and elsewhere in this disclaimer: (a) are subject to the preceding paragraph; and (b) govern all liabilities arising under the disclaimer, including liabilities arising in contract, in tort and for breach of statutory duty.</p>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>As long as the website and the information and services on the website are provided free of charge, we will not be liable for any loss or damage of any nature.</p>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#fbbf24', marginTop: '2.5rem', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(59, 130, 246, 0.2)' }}>Content Creator Program</h3>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>The Lines Police CAD Content Creator Program ("Program") is a voluntary program for content creators who produce content featuring Lines Police CAD. By participating in this Program, you agree to the following terms and conditions:</p>
          <h4 style={{ fontSize: '1.125rem', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)', marginTop: '2rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(59, 130, 246, 0.15)' }}>Eligibility Requirements</h4>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>To be eligible for the Program, you must have at least 500 followers on a single content platform (e.g., YouTube, Twitch, TikTok, etc.). Follower counts across multiple platforms cannot be combined to meet this requirement. For example, having 200 followers on YouTube and 300 followers on Twitch would not qualify.</p>
          <h4 style={{ fontSize: '1.125rem', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)', marginTop: '2rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(59, 130, 246, 0.15)' }}>Follower Verification</h4>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>Follower counts are subject to periodic verification by our system. You must provide accurate follower information when applying and when syncing your follower counts. Knowingly providing false or misleading follower information may result in immediate removal from the Program and potential suspension from Lines Police CAD services.</p>
          <h4 style={{ fontSize: '1.125rem', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)', marginTop: '2rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(59, 130, 246, 0.15)' }}>Grace Period</h4>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>If your follower count drops below 500 on all platforms after being accepted into the Program, you will enter a 30-day grace period. During this time, you will retain your Program benefits while you work to meet the minimum requirement again. If you do not meet the requirement by the end of the grace period, you will be removed from the Program.</p>
          <h4 style={{ fontSize: '1.125rem', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)', marginTop: '2rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(59, 130, 246, 0.15)' }}>Program Benefits</h4>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>Program participants may receive benefits including, but not limited to: a free Base Plan subscription for one community, a public profile on the Content Creators page, and recognition within the Lines Police CAD community. Benefits are subject to change at any time at the sole discretion of Lines Police CAD.</p>
          <h4 style={{ fontSize: '1.125rem', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)', marginTop: '2rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(59, 130, 246, 0.15)' }}>Community Promotion</h4>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>Content creators may apply a free Base Plan subscription to one community they own. This promotion cannot be transferred to another community once applied. If you are removed from the Program, the promoted community will lose its Base Plan benefits.</p>
          <h4 style={{ fontSize: '1.125rem', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)', marginTop: '2rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(59, 130, 246, 0.15)' }}>Content Guidelines</h4>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>As a Program participant, you are expected to create content that positively represents Lines Police CAD. Content that is hateful, discriminatory, promotes illegal activity, or damages the reputation of Lines Police CAD may result in removal from the Program.</p>
          <h4 style={{ fontSize: '1.125rem', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)', marginTop: '2rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(59, 130, 246, 0.15)' }}>Removal from Program</h4>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>Lines Police CAD reserves the right to remove any participant from the Program at any time, for any reason, including but not limited to: failure to meet eligibility requirements, providing false information, violating these terms or the general Terms and Conditions, or conduct that damages the reputation of Lines Police CAD.</p>
          <h4 style={{ fontSize: '1.125rem', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)', marginTop: '2rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(59, 130, 246, 0.15)' }}>Voluntary Withdrawal</h4>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>You may withdraw from the Program at any time by submitting a withdrawal request through your creator dashboard. Upon withdrawal, all Program benefits will be revoked, including any community promotions.</p>
          <h4 style={{ fontSize: '1.125rem', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)', marginTop: '2rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(59, 130, 246, 0.15)' }}>No Employment Relationship</h4>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>Participation in the Program does not create an employment, partnership, or agency relationship between you and Lines Police CAD. You are an independent content creator and are solely responsible for your content and actions.</p>
          <h4 style={{ fontSize: '1.125rem', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)', marginTop: '2rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(59, 130, 246, 0.15)' }}>Modifications to Program</h4>
          <p style={{ margin: '1.25rem 0', textAlign: 'left', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>Lines Police CAD reserves the right to modify, suspend, or terminate the Program or these terms at any time. Continued participation in the Program after changes have been made constitutes acceptance of the modified terms.</p>
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
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1.5rem',
                flexWrap: 'wrap'
              }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '80px',
                  height: '80px',
                  borderRadius: '1rem',
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  boxShadow: '0 0 30px rgba(239, 68, 68, 0.4)',
                  flexShrink: 0
                }}>
                  <DocumentTextIcon style={{ width: '40px', height: '40px', color: '#ffffff' }} />
                </div>
                <h1 style={{
                  fontSize: 'clamp(2.5rem, 6vw, 4rem)',
                  fontWeight: '700',
                  marginBottom: '0.5rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  position: 'relative',
                  display: 'inline-block'
                }}>
                {/* Glow behind text */}
                <span style={{
                  position: 'absolute',
                  inset: 0,
                  color: '#fbbf24',
                  textShadow: '0 0 20px rgba(251, 191, 36, 0.5), 0 0 40px rgba(251, 191, 36, 0.3)',
                  filter: 'blur(2px)',
                  zIndex: 0
                }}>
                  Terms and Conditions
                </span>
                {/* Shimmer text */}
                <span style={{
                  position: 'relative',
                  zIndex: 1,
                  background: 'linear-gradient(90deg, #fbbf24 0%, #ffffff 30%, #ffffff 70%, #fbbf24 100%)',
                  backgroundSize: '200% 100%',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  animation: 'shimmer 12s linear infinite',
                  display: 'inline-block'
                }}>
                  Terms and Conditions
                </span>
              </h1>
              </div>
              <p style={{
                fontSize: '1rem',
                color: 'rgba(255, 255, 255, 0.6)',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
              }}>
                Last updated: January 24, 2026
              </p>
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
          </div>
        </div>

        <Footer />
      </div>
    </main>
  );
}


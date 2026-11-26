#!/usr/bin/env python3
"""Builds the guide pages (guides/*.html), guides/guides.css and sitemap.xml.

Run from the repository root:  python3 -I tools/build_guides.py
The articles live in this file so the pages stay consistent (same header, footer, metadata and
structured data). Edit the text here, rebuild, commit the generated files.
"""
import json, pathlib

BASE = 'https://seb-toolkit.github.io/config-builder/'
ROOT = pathlib.Path(__file__).resolve().parent.parent
PUBLISHED = '2026-11-26'
SITE_NAME = 'SEB Config Builder'
DISCLAIMER = ('This is an independent tool and guide. It is not made, endorsed or supported by the Safe Exam Browser project, '
              'ETH Zürich or the SEB Alliance. Official information is at <a href="https://safeexambrowser.org">safeexambrowser.org</a>.')

ARTICLES = [
{
 'slug': 'make-seb-config-file-moodle',
 'title': 'How to make a Safe Exam Browser (.seb) file for a Moodle quiz',
 'seo_title': 'Make a Safe Exam Browser (.seb) file for Moodle',
 'description': 'A step-by-step guide to making a Safe Exam Browser config file for a Moodle quiz: pick the settings, download the .seb file, upload it to Moodle and test it.',
 'summary': 'From an empty page to a tested .seb file you can upload to Moodle.',
 'body': '''
<p>A <code>.seb</code> file is a small settings file for Safe Exam Browser (SEB). It tells SEB which page to open, how students leave, which websites are allowed and what they can do while the exam runs. This guide takes you from nothing to a file uploaded to a Moodle quiz.</p>

<h2>Before you start</h2>
<ul>
<li><b>The quiz address.</b> Open the quiz in your normal browser and copy the address from the bar.</li>
<li><b>A quit password.</b> Students need it to leave SEB. Invigilators give it out at the end, or you skip it for practice quizzes.</li>
<li><b>Two test computers.</b> One Windows and one Mac if students use both. You will try the file on them before the real exam.</li>
</ul>

<h2>Step 1: Pick the situation closest to yours</h2>
<p>Open the <a href="../">SEB Config Builder</a>. It starts with a handful of situations, such as a closed-book Moodle quiz, a practice quiz or an open-book exam. Each one lists in plain words what it assumes (full screen, only the quiz site allowed, copy and paste inside the exam only, and so on). Choose the nearest one and you can change every choice in the questions that follow.</p>

<h2>Step 2: Answer the questions</h2>
<ol>
<li><b>Exam address.</b> Paste the quiz address.</li>
<li><b>Computers.</b> Tick Windows, Mac and iPad as needed. This only decides which settings are shown to you.</li>
<li><b>Leaving SEB.</b> Set a quit password, or let students quit freely. You can also give a quit link: a web address that makes SEB quit the moment it is about to open it. Pick one students would never click by accident (not the quiz, review or home page), such as <code>https://moodle.example.ac.uk/seb-exit</code>. Moodle shows an Exit Safe Exam Browser button for it on the quiz page once a student has finished an attempt.</li>
<li><b>Websites.</b> Only the exam site, the exam site plus others you list, or any website. See <a href="seb-url-filter-moodle.html">which sites to allow for Moodle</a>.</li>
<li><b>Microsoft sign-in.</b> If students log in with a university Microsoft account, see <a href="microsoft-sign-in-safe-exam-browser.html">the guide on Microsoft sign-in</a>.</li>
<li><b>Screen and features.</b> Full screen or window; copy and paste; spell check, printing, back and forward; downloads and uploads.</li>
<li><b>Moodle check.</b> Whether SEB sends its keys. When you upload the file, Moodle switches this on itself, so the answer matters little for Moodle.</li>
</ol>

<h2>Step 3: Download the file</h2>
<p>Check the summary, then download the <code>.seb</code> file. Everything runs in your browser, so nothing is uploaded anywhere. If you plan to reuse the choices, save them as a named setup first.</p>

<h2>Step 4: Upload it to Moodle</h2>
<p>In the quiz settings, open the <i>Safe Exam Browser</i> section and set <i>Require the use of Safe Exam Browser</i> to <i>Yes – Upload my own config</i>. Upload the file and save. Students then see a button to launch the quiz in SEB. They do not need the file on their own computers.</p>
<p>If you change the settings later, upload the new file to Moodle again.</p>
<p><b>What Moodle does with your file.</b> This is from reading Moodle 4.5's Safe Exam Browser code and testing a builder file on it:</p>
<ul>
<li>Moodle reads the settings itself, so the file must be a plain, unencrypted <code>.seb</code> file. The builder saves plain files by default. A file with a password, or one compressed by another tool, is rejected with a parse error when you upload it. (The builder only makes a password-protected file if you set a file password, so leave that blank for Moodle.)</li>
<li>Moodle replaces the start address with the quiz's own address, and turns on sending the browser exam key. The start address in your file does not decide where students land; it only helps the builder work out the website filter.</li>
<li>Students start the quiz from Moodle's launch button, which gives them Moodle's own copy of the settings.</li>
</ul>

<h2>Step 5: Test it</h2>
<p>Install SEB on your test computers and start the quiz from Moodle. Check that:</p>
<ul>
<li>the quiz opens full screen and the login works;</li>
<li>pages and images load (if something is missing, a website you need is probably blocked);</li>
<li>copy and paste behaves as you expect;</li>
<li>the quit password works and the quit link, if you set one, ends the session.</li>
</ul>
<p>The builder follows SEB's published source code, but it is an unofficial tool. Always test a file in real SEB before an exam.</p>

<h2>If the file will not open or upload</h2>
<ul>
<li>The name must end in exactly <code>.seb</code>. Some browsers add another ending such as <code>.txt</code>; rename the file if so.</li>
<li>Try copying the file to the Desktop and picking it from there.</li>
<li>If Moodle says the file cannot be parsed, it is probably compressed or password-protected. Make a new file with no file password.</li>
<li>If SEB rejects it, note the exact message and the SEB version. The settings and version matter.</li>
</ul>
''',
},
{
 'slug': 'seb-url-filter-moodle',
 'title': 'Safe Exam Browser URL filter for Moodle: what to allow and how to test it',
 'seo_title': 'Safe Exam Browser URL filter for Moodle: what to allow',
 'description': 'Which websites to allow in Safe Exam Browser for a Moodle quiz, how SEB URL filter patterns work, and how to find the exact list by recording a real session.',
 'summary': 'The patterns, the page-versus-content difference, and a way to find every site a quiz uses.',
 'body': '''
<p>Safe Exam Browser (SEB) can limit which websites students open during an exam. This is the URL filter. Used well, it keeps students on the quiz. Used badly, it breaks images, equations or login. This guide explains how it behaves and how to build the right list.</p>

<h2>How the filter decides</h2>
<ul>
<li><b>Block rules win.</b> SEB checks Block rules first, then Allow rules. A web address that matches nothing is blocked.</li>
<li><b>The start page is allowed automatically.</b> If your start address would otherwise be blocked, SEB adds an allow rule for it.</li>
<li><b>Matching ignores case</b>, and addresses are decoded before they are matched.</li>
</ul>

<h2>Pages only, or everything on the page?</h2>
<p>There are two levels:</p>
<ul>
<li><b>Filter pages (the usual setting).</b> Only the page a student navigates to is checked. Scripts, images and fonts that the page loads from elsewhere are not checked.</li>
<li><b>Filter embedded content as well.</b> Every request is checked: images, scripts, frames and background requests. This is stricter, and every host the quiz uses must be allowed.</li>
</ul>
<p>With page filtering, the list is short, often just your Moodle address and the sign-in site. Only switch on content filtering if you need it.</p>

<h2>Writing patterns</h2>
<table>
<tr><th>Pattern</th><th>Matches</th></tr>
<tr><td><code>moodle.example.ac.uk</code></td><td>That site and its subdomains</td></tr>
<tr><td><code>.moodle.example.ac.uk</code></td><td>That host only, no subdomains (leading dot)</td></tr>
<tr><td><code>*.example.org</code></td><td>Any subdomain of example.org</td></tr>
<tr><td><code>example.org/path/*</code></td><td>Anything under that path</td></tr>
</table>
<p>You can also use regular expressions. Be aware that SEB for Windows uses the .NET regular-expression engine, which differs from some others in details, and SEB for Mac has its own implementation of the check that is close to the Windows one but not identical.</p>

<h2>What a Moodle quiz usually needs</h2>
<p>Moodle serves most of its own scripts, styles and files from the same address, so the Moodle host is usually enough. Things that commonly need extra entries:</p>
<ul>
<li><b>Sign-in.</b> Your university single sign-on, for example Microsoft (<a href="microsoft-sign-in-safe-exam-browser.html">see the Microsoft guide</a>), Shibboleth or SAML.</li>
<li><b>Equations.</b> The MathJax filter loads from a content network by default in recent Moodle versions. Check the setting under Site administration, Plugins, Filters, MathJax. This only matters if you filter embedded content.</li>
<li><b>Embedded media.</b> For example YouTube or Vimeo.</li>
<li><b>Site add-ons.</b> Video platforms and similar tools your institution has installed.</li>
<li><b>A download site.</b> If a question asks students to download a file from elsewhere, <a href="download-upload-files-safe-exam-browser.html">allow that site too</a>.</li>
</ul>

<h2>Find the exact list instead of guessing</h2>
<p>Record a real session and let the tool list every site:</p>
<ol>
<li>Open the quiz in Chrome, Edge or Firefox and press F12. Open the Network tab and tick <i>Preserve log</i>.</li>
<li>Go through the whole quiz, including login and any embedded content.</li>
<li>Export the recording as a HAR file, or right-click the list and copy all the URLs.</li>
<li>Drop the file into <i>Test the URL filter</i> in the <a href="../">builder</a>. It checks each address against your rules and offers an <i>Allow site</i> button for blocked hosts.</li>
</ol>
<p>The tool reads only the address, request type, time and status of each request. It ignores cookies and headers, and nothing is uploaded. A HAR file can contain login cookies, so do not share one.</p>
<p>The matching code is a port of the filter in SEB for Windows and passes that project's own unit-test cases. Even so, test the finished file in real SEB.</p>
''',
},
{
 'slug': 'microsoft-sign-in-safe-exam-browser',
 'title': 'Microsoft sign-in, two-step verification and passkeys in Safe Exam Browser (2026)',
 'seo_title': 'Microsoft sign-in and passkeys in Safe Exam Browser',
 'description': 'What works when students log in with a Microsoft account inside Safe Exam Browser: phone approval, Windows Hello, passkeys and the known limits.',
 'summary': 'Phone approval works; passkeys and Windows Hello are the problem. What the SEB project says.',
 'body': '''
<p>Many universities use Microsoft (Entra ID) to log students in to Moodle. When students sign in inside Safe Exam Browser (SEB), the type of second step matters a great deal. This guide summarises what is known as of November 2026 and what to do about it. It is based on public discussion in the SEB project, so treat it as guidance and test it on real computers.</p>

<h2>The short version</h2>
<ul>
<li><b>Approval on a phone</b> (the Authenticator app or a text message) is the safest option. The approval happens on the phone, outside SEB, so nothing special is needed in SEB itself, apart from allowing the Microsoft web addresses if you filter websites.</li>
<li><b>Windows Hello, a PIN, a passkey or a security key</b> show a Windows security prompt. SEB can block or hide it, and the login page then waits forever.</li>
<li><b>Passkeys do not work in SEB for Mac or iPad</b>, because the browser engine they use does not support them.</li>
</ul>

<h2>What the problem looks like</h2>
<p>The SEB for Windows issue <a href="https://github.com/SafeExamBrowser/seb-win-refactoring/issues/1518">#1518</a> describes it. Microsoft is making passkeys the default sign-in method in Entra ID, and the issue gives September 2026 as the start. In SEB, the passkey prompt is a Windows Security (WebAuthn) window. An earlier report, <a href="https://github.com/SafeExamBrowser/seb-win-refactoring/issues/921">#921</a>, saw the same thing in 2024: the prompt opens in the background, or appears only after SEB is closed.</p>

<h2>What helped people</h2>
<ul>
<li><b>Permit the Windows sign-in components.</b> Add <code>CredentialUIBroker.exe</code>, <code>PickerHost.exe</code> and <code>PinEnrollmentBroker.exe</code> to SEB's permitted programs. The issue thread reports success with these three.</li>
<li><b>Choose the right Windows kiosk mode.</b> With the default "separate desktop" mode, the prompt stays hidden. One user reported that the "disable Explorer shell" mode lets it appear.</li>
<li><b>Use a recent SEB.</b> Some users on 3.10.1 had the problem fixed by upgrading to 3.10.2.</li>
<li><b>Avoid the passkey.</b> One school switched accounts to Authenticator push approval and deleted synced passkeys.</li>
<li><b>Log in before SEB.</b> A Moodle plugin avoids the sign-in inside SEB altogether: <a href="https://github.com/ethz-let/moodle-quizaccess_seb_autologin"><code>moodle-quizaccess_seb_autologin</code></a> from ETH Zürich. A member of the SEB team suggested it in the issue thread, as a pilot that was "not yet thoroughly tested". Students log in as normal in their usual browser, start the quiz, and the plugin signs them in when SEB opens. Its page lists these requirements and limits: Moodle 4.2 or later over HTTPS, web services enabled, and the Safe Exam Browser access rule on the quiz. On Windows, <code>startURLAppendQueryParameter</code> must be true in the SEB settings. The token that carries the login lasts five minutes and is tied to the student's IP address. It does not apply to Moodle administrators, guests or suspended accounts. Its authors warn it may affect your setup, so test it on a copy of your site first, and ask your Moodle administrator, since it is a plugin that has to be installed.</li>
</ul>

<h2>The security trade-off</h2>
<p>Permitting a program without checking its original name and its signature means a student could rename another program to match. The SEB maintainers raised this, and said a fix is planned for SEB 4, with no date given. The issue was closed by an automatic stale-bot on 24 November 2026 as "not planned", so do not assume a change is coming soon.</p>

<h2>What the builder does</h2>
<p>In the <a href="../">SEB Config Builder</a>, the question "Do students sign in with a Microsoft account?" offers three answers:</p>
<ul>
<li><b>No Microsoft sign-in.</b></li>
<li><b>Yes, approve on the phone.</b> If you filter websites, the builder allows the Microsoft sign-in addresses (<code>login.microsoftonline.com</code>, <code>login.microsoft.com</code>, <code>login.live.com</code>, <code>login.windows.net</code>, <code>msauth.net</code> and <code>msftauth.net</code>). These come from Microsoft documentation, not from SEB, so confirm them with a recorded session as described in the <a href="seb-url-filter-moodle.html">URL filter guide</a>.</li>
<li><b>Yes, Windows Hello, PIN, passkey or key.</b> Windows only. It permits the three programs without a name or signature check, and switches the kiosk mode. The security warning above applies.</li>
</ul>

<h2>Recommended plan</h2>
<ol>
<li>Ask students to use phone approval and to delete any passkey they have set up. Microsoft may offer a new passkey by default, so tell them to decline it.</li>
<li>Test the whole sign-in on a real Windows computer, and on a Mac if you have Mac students.</li>
<li>Have a fallback: a short practice quiz a few days before, so problems appear early.</li>
</ol>

<h2>Sources</h2>
<ul>
<li><a href="https://github.com/SafeExamBrowser/seb-win-refactoring/issues/1518">SEB for Windows issue #1518: Passkeys will be the default authentication method in Entra ID</a></li>
<li><a href="https://github.com/SafeExamBrowser/seb-win-refactoring/issues/921">SEB for Windows issue #921: Passkey support</a></li>
<li><a href="https://github.com/ethz-let/moodle-quizaccess_seb_autologin">moodle-quizaccess_seb_autologin (ETH Zürich) on GitHub</a></li>
<li><a href="https://learn.microsoft.com/entra/identity/enterprise-apps/tenant-restrictions">Microsoft: sign-in endpoints (tenant restrictions)</a></li>
</ul>
''',
},
{
 'slug': 'download-upload-files-safe-exam-browser',
 'title': 'Downloading and uploading files in Safe Exam Browser: where files go',
 'seo_title': 'Downloads and uploads in Safe Exam Browser',
 'description': 'How Safe Exam Browser handles file downloads and uploads in a Moodle quiz: the download folder, upload dialog, temporary folder and the Mac switch.',
 'summary': 'Where downloaded files are saved, what students can pick when uploading, and how to keep it tidy.',
 'body': '''
<p>Some quizzes ask students to download a file (a dataset, a template) and then upload their work to Moodle. Safe Exam Browser (SEB) can allow this, but the details of where files go are not obvious. This guide is based on reading the SEB for Windows source code and its settings; the Mac side is covered more lightly.</p>

<h2>Students do not need File Explorer</h2>
<p>When a student clicks an upload button, SEB shows its own file dialog. The dialog is part of SEB, so File Explorer is not needed.</p>

<h2>Where downloads are saved (Windows)</h2>
<ul>
<li>Files go straight to the download folder with no prompt. This is the folder in the setting <code>downloadDirectoryWin</code>. If it is empty, it is the user's normal Downloads folder.</li>
<li>If a file with that name already exists, SEB adds a number to the new file.</li>
<li>Only if "allow custom download and upload location" is on do students get a save dialog and a choice of folder.</li>
</ul>

<h2>What students can pick when uploading (Windows)</h2>
<ul>
<li>The dialog opens in the same download folder.</li>
<li>With the custom location setting off, which is the default, navigation is restricted: students can only choose from that folder.</li>
<li>With it on, students can browse the whole computer, including their own documents. That is rarely wanted in an exam.</li>
</ul>

<h2>The tidy-up problem</h2>
<p>The restricted dialog still shows everything in the Downloads folder: old files, and on a shared lab computer, other people's. The fix is the setting <b>use a temporary directory for downloads and uploads</b>. SEB creates a fresh empty folder for the session and removes it when SEB quits, so the dialog shows only what the student just downloaded. According to SEB's own help text, the temporary folder is removed when the session ends.</p>

<h2>On a Mac</h2>
<p>SEB for Mac needs a master switch, <code>allowDownUploads</code>, in addition to the separate allow-downloads and allow-uploads settings. If it is off, downloads and uploads are blocked even when the other two are on. The Mac client also has a setting to reuse the most recently downloaded file when a student uploads, instead of showing a file picker. This guide has not checked how the Mac file picker is restricted, so test it.</p>

<h2>Other things to remember</h2>
<ul>
<li><b>Allow the download site.</b> If you filter websites and the file comes from a different host than Moodle, allow that host. See the <a href="seb-url-filter-moodle.html">URL filter guide</a>.</li>
<li><b>Do not open downloads in other programs.</b> On a Mac, "open files after downloading" would launch another application, which can let students out of the locked-down browser. Leave it off.</li>
<li><b>PDF files.</b> By default SEB shows PDFs itself. A separate setting makes it download them instead, so check how your quiz links to PDFs.</li>
<li><b>iPad.</b> SEB's own help warns that uploading on iOS gives access to the camera and full photo library.</li>
</ul>

<h2>Set it up in the builder</h2>
<p>The <a href="../">SEB Config Builder</a> has a template called "Download a file, then upload an answer". It turns on downloads and uploads, uses the temporary folder, keeps the custom location off, sets the Mac master switch, and asks you for the download site so it can be allowed. As always, test the file in real SEB first.</p>
''',
},
{
 'slug': 'secure-exam-environments',
 'title': 'Secure exam environments: what Safe Exam Browser does and does not do',
 'seo_title': 'Secure exam environments: what SEB does and does not do',
 'description': 'A plain look at secure exam environments: what a lockdown browser like Safe Exam Browser can and cannot stop, what research says, and how to layer your approach.',
 'summary': 'What a lockdown browser can stop, what the evidence says, and how to build a sensible layered approach.',
 'body': '''
<p>A secure exam environment is whatever you set up so that students sit an exam under the conditions you intend: no extra help, no other people, no unplanned resources. A lockdown browser such as Safe Exam Browser (SEB) is one part of that. This guide explains what it does, where its limits are, and how the published evidence reads.</p>

<h2>The layers of an exam environment</h2>
<ol>
<li><b>The device.</b> Managed lab computers you control, or students' own laptops (often called BYOD, bring your own device). Managed devices are much easier to secure.</li>
<li><b>The browser.</b> A lockdown browser limits what the computer does during the exam: it can block other programs, copy and paste to other applications, screenshots and websites you have not allowed.</li>
<li><b>The server.</b> The exam system can check that requests come from SEB with the right settings, using keys that SEB sends.</li>
<li><b>The room or the people.</b> Invigilators in a room, remote proctoring, or neither.</li>
<li><b>The assessment itself.</b> Question banks, randomised questions, time limits, questions that need reasoning rather than looking up, open-book design, or a short follow-up conversation with the student.</li>
</ol>
<p>Each layer reduces some risks and leaves others. The usual mistake is to rely on one layer, often the browser, for everything.</p>

<h2>What a lockdown browser can reasonably do</h2>
<ul>
<li>Stop students switching to other programs or using the computer's other tools during the exam.</li>
<li>Limit which websites can be opened, and control copy and paste, printing, downloads and uploads.</li>
<li>Make casual cheating on the exam computer harder, and deliberate cheating more effortful.</li>
</ul>

<h2>What it cannot do</h2>
<ul>
<li><b>It cannot see or control a second device.</b> A phone or another laptop next to the exam computer is outside its reach. Published studies report staff and students raising exactly this point.</li>
<li><b>It cannot stop help from another person</b> in the room or on a call.</li>
<li><b>It cannot make an unmanaged computer fully trustworthy.</b> The software runs on a machine the student controls.</li>
</ul>

<h2>What the evidence says</h2>
<p>Independent security research on SEB that I could find is limited, and much of it is a student thesis or a small case study. These are the sources I read, with what they actually show.</p>
<ul>
<li><b>A 2023 master's thesis at Chalmers University of Technology</b> (Cronqvist and Kortesaari, <i>Securing Electronic Exam Environments</i>) uses threat modelling and then analyses SEB in a case study. It reports several vulnerabilities and successful attacks, and says six of its eight proposed design principles were not followed by SEB. One finding matters if you use the Browser Exam Key or Config Key checks: the authors show that a student who has the settings file can work out the same keys, so a server that only checks those headers can be satisfied by something other than SEB. In their case study, the exam system only checked the browser's user-agent text, which is easier still to fake. It is a thesis, not a peer-reviewed paper, and it covers one exam set-up.</li>
<li><b>CVE-2024-37742</b> is a published security record for SEB 3.5.0 on Windows. It describes access control that let clipboard data pass between the locked-down session and the computer underneath. Public records point to a proof of concept, and sources differ on which version fixed it, so use a current SEB release and check the official entry for the latest status.</li>
<li><b>A 2022 case study in the journal JITEKI</b> (Mohammed and Ali, University of Mosul) ran a Moodle exam with and without SEB and observed what a student could open, using network and registry monitoring tools. It concludes that lockdown browsers help reduce cheating on the exam computer. It is a single small case study and does not measure actual cheating rates.</li>
<li><b>A 2015 dissertation by Rosario Giustolisi</b> includes a chapter that analyses SEB version 2.0 and its certificate checks. It states that its threat model does not cover malicious candidates, so it is about other risks.</li>
</ul>
<p>Taken together: SEB raises the effort needed to cheat on the exam computer, and researchers have found ways around it in specific versions and set-ups. That is expected for software running on a computer the student controls. It is a reason to combine layers, not a reason to avoid them.</p>

<h2>A sensible layered approach</h2>
<ol>
<li><b>Prefer managed computers</b> for high-stakes exams where you can. Use students' own devices for lower-stakes work.</li>
<li><b>Keep SEB up to date</b> and set a minimum version for the quiz if your system allows it.</li>
<li><b>Treat key checks as a speed bump</b>, not proof that the real SEB was used.</li>
<li><b>Design questions that are harder to share or look up:</b> randomise, use banks, vary numbers, ask for reasoning or application.</li>
<li><b>Add a human check where stakes are high:</b> an invigilator, or a short viva for a sample of students.</li>
<li><b>Plan for failure.</b> Have a fallback if SEB will not start on a student's computer, and run a practice quiz first.</li>
<li><b>Be open with students</b> about what SEB does and does not collect, and plan adjustments for students with access needs.</li>
</ol>

<h2>Where this tool fits</h2>
<p>The <a href="../">SEB Config Builder</a> only makes the settings file. It cannot make a weak exam design strong. It aims to make the browser layer easier to set up correctly and to test. See the <a href="make-seb-config-file-moodle.html">step-by-step guide</a> to build a file.</p>

<h2>Sources</h2>
<ul>
<li>Cronqvist, D. and Kortesaari, S. (2023). <a href="https://odr.chalmers.se/bitstreams/467893e1-9f9a-4e90-8548-f0932c0369c2/download"><i>Securing Electronic Exam Environments: Threats, mitigations, and design principles</i></a>. Master's thesis, Chalmers University of Technology and University of Gothenburg.</li>
<li><a href="https://nvd.nist.gov/vuln/detail/CVE-2024-37742">CVE-2024-37742</a> in the US National Vulnerability Database.</li>
<li>Mohammed, H. M. and Ali, Q. I. (2022). <a href="http://dx.doi.org/10.26555/jiteki.v8i4.25094">Cheating prevention in e-proctoring systems using secure exam browsers: a case study</a>. <i>JITEKI</i> 8(4), 634–648.</li>
<li>Giustolisi, R. (2015). <a href="https://arxiv.org/abs/1512.04751"><i>Design and Analysis of Secure Exam Protocols</i></a>. arXiv:1512.04751.</li>
<li>Schneider, D. R., Bauer, D., Lehre, M., Piendl, T. and Volk, B. (2012). The Safe Exam Browser: Innovative open source software for online examinations. 18th International Conference on Technology Supported Learning &amp; Training.</li>
</ul>
''',
},
{
 'slug': 'block-generative-ai-safe-exam-browser',
 'title': 'Preventing access to generative AI in Safe Exam Browser',
 'seo_title': 'Block generative AI in Safe Exam Browser',
 'description': 'How to keep students away from ChatGPT and other generative AI in Safe Exam Browser: the allow-list that matters, the settings that do not, and what SEB cannot stop.',
 'summary': 'What actually keeps AI assistants out of an exam, and what does not.',
 'body': '''
<p>If your aim is to stop students using generative AI during an exam, the Safe Exam Browser (SEB) setting that matters is the website allow-list. Other settings, such as the address bar and back button, have little to do with it. This guide explains what works, what does not, and where SEB cannot help.</p>

<h2>The setting that does the work: only list the sites students need</h2>
<p>SEB's URL filter checks Block rules first, then Allow rules, and blocks any address that matches nothing. So when you allow only the exam site (and its sign-in), every AI assistant is blocked by default, including ones that do not exist yet. This is far more reliable than trying to list AI sites to block. See the <a href="seb-url-filter-moodle.html">URL filter guide</a> for the pattern rules.</p>
<ul>
<li><b>Stricter: check embedded content too.</b> By default only the page a student navigates to is checked. Turn on "filter embedded content" and every request is checked, so an allowed page cannot load an AI chat widget or call an AI service from another site. The cost is that every site the quiz uses must be allowed, so test with a recorded run first.</li>
<li><b>If students must browse the open web,</b> you cannot use an allow-list. The builder can allow everything and block a starting list of well-known assistants (for example <code>chatgpt.com</code>, <code>openai.com</code>, <code>claude.ai</code>, <code>gemini.google.com</code>, <code>copilot.microsoft.com</code>, <code>perplexity.ai</code>, <code>poe.com</code>, <code>character.ai</code>, <code>deepseek.com</code>, <code>grok.com</code>, <code>meta.ai</code>, <code>chat.mistral.ai</code>, <code>you.com</code>, <code>phind.com</code> and <code>duck.ai</code>). This is a deterrent, not a guarantee: new tools appear constantly, and search engines show AI-written answers on pages you cannot block without blocking search.</li>
</ul>

<h2>The address bar, back button and tabs</h2>
<ul>
<li><b>Address bar.</b> On Windows, SEB shows a field for typing addresses only if you allow it, and the default is off. There is no separate read-only address bar: it is either a box students can type in, or nothing. Leave it off. Even if it were on, the allow-list would still block anything not listed. A separate setting controls whether SEB shows the page's address or its title in the window.</li>
<li><b>Back and forward.</b> These only revisit pages the student has already opened, so with an allow-list they add no AI risk. The reason to leave them off for a quiz is different: going back inside an attempt can confuse the quiz. Switch them on when students browse web pages as part of the task.</li>
<li><b>Tabs.</b> SEB has no tabs. Links that would open a new window are blocked, opened in the same window or opened in a new window, as you choose, and the filter applies to all of them.</li>
</ul>

<h2>What the filter does not cover</h2>
<ul>
<li><b>AI inside an allowed site.</b> Moodle 4.5 includes AI features. In its source, the editor placement gives the student role permission to generate text and images by default, so if your Moodle has AI switched on, an answer editor may offer it. SEB cannot see that. Ask your administrator to turn the AI placements off, or remove the permission for students in exam courses, and check what an essay question's editor looks like to a student.</li>
<li><b>Other programs.</b> SEB's own list of programs to block contains hundreds of entries, but only three are AI-related (AnyGPT, Cotypist and WunderType, in the version I checked). Do not rely on it. What protects you is SEB's kiosk mode, which hides other programs, and on managed computers, controls you set yourself.</li>
<li><b>Operating-system AI.</b> SEB for Mac has settings for Siri and dictation, which the builder leaves off. I did not find a setting for other built-in AI features on Mac or Windows, and have not tested what Windows Copilot's keyboard shortcut does inside SEB, so check this on real computers.</li>
<li><b>Another device.</b> A phone next to the computer is outside SEB's reach.</li>
</ul>

<h2>Recommended settings for a closed-book exam</h2>
<ol>
<li>Allow only the exam site and its sign-in. No "any website".</li>
<li>Consider checking embedded content as well, after a test run.</li>
<li>Leave the address bar off. Leave back and forward off unless the task needs them.</li>
<li>Ask your Moodle administrator about AI placements.</li>
<li>Pair it with assessment design that is harder to answer with an AI, such as application to unseen data, or a short follow-up conversation, as discussed in the <a href="secure-exam-environments.html">guide to secure exam environments</a>.</li>
</ol>

<h2>Set it up in the builder</h2>
<p>In the <a href="../">SEB Config Builder</a>, choose "No: only the exam" or "Only a few sites that I will list" when it asks about browsing. The Fine-tune step then offers the stricter embedded-content check. If you choose "any website", it blocks the starting list of AI sites and warns you about the limits. Test the finished file in real SEB first.</p>
''',
},
{
 'slug': 'seb-server-logging-hosting-firewalls',
 'title': 'SEB Server: logging student activity, where to host it, and what happens behind a firewall',
 'seo_title': 'SEB Server: logging, hosting and firewalls',
 'description': 'Can Safe Exam Browser log student activity? How SEB Server works, how clients connect, where to host it, and what happens if a firewall blocks it.',
 'summary': 'What SEB can record, how it connects to SEB Server, where the server can run, and what fails when the network does.',
 'body': '''
<p>Safe Exam Browser (SEB) can record some of what students do and send it to a central server, but only through a separate piece of software called SEB Server. Neither a plain <code>.seb</code> file nor Moodle's Safe Exam Browser setting does this on its own. This guide explains what SEB records, how it connects, where the server can run, and what happens when a firewall gets in the way. It is based on the SEB for Windows source code and the SEB Server setup documentation as of November 2026. I have not run a production SEB Server, so test everything on your own network.</p>

<h2>What SEB records without a server</h2>
<ul>
<li><b>A local log.</b> SEB keeps a log on the student's computer, with a setting for the folder (<code>enableLogging</code>, <code>logDirectoryWin</code> and <code>logDirectoryOSX</code>). SEB's help text describes it as useful for debugging and for finding possible manipulation. Nothing sends it anywhere by itself.</li>
<li><b>Web addresses in that log.</b> A setting controls how SEB shows and logs addresses (<code>browserWindowShowURL</code>). Set to "never", URLs are neither shown nor logged.</li>
<li><b>Moodle.</b> Moodle's Safe Exam Browser plugin checks settings and keys. I found no logging of student web activity in it. Moodle's own logs show activity inside Moodle, such as quiz attempts.</li>
</ul>

<h2>What SEB Server adds</h2>
<ul>
<li><b>Regular pings</b> at a set interval, so invigilators can see who is connected.</li>
<li><b>Log events</b>, queued by the client and sent in batches on a timer.</li>
<li><b>Status</b> of the network connection and the power supply.</li>
<li><b>Messages in both directions:</b> students can raise a hand, and invigilators can lock a screen or end a session. The client confirms each instruction.</li>
<li><b>Screen proctoring</b> (optional). With a Screen Proctoring service, SEB takes screenshots at set intervals and can attach metadata: the active program, the window title and the web address. These settings (<code>screenProctoringMetadataURLEnabled</code> and its siblings) can only be configured through SEB Server, according to SEB's help text. It is a separate service from the main server.</li>
</ul>
<p>I did not read the details of exactly which log events are sent, so check SEB Server's documentation for that.</p>

<h2>How the clients connect</h2>
<p>SEB always makes the connection. The server never connects into a student's computer. In the Windows client the sequence is:</p>
<ol>
<li><b>Connection settings.</b> The student starts SEB with a small configuration that holds the server address, an API discovery address, the institution, a client name and secret, and optionally an exam identifier. SEB Server generates this for you. The <a href="../">SEB Config Builder</a> does not make it.</li>
<li><b>Discover the API and log in.</b> SEB loads the API from the discovery address and requests an access token with the client name and secret.</li>
<li><b>Choose the exam.</b> SEB asks which exams are available, and lets the student choose unless the configuration names one.</li>
<li><b>Fetch the exam settings.</b> SEB downloads the exam's configuration from the server and starts the exam with it. With SEB Server, the settings can come from the server rather than a file you upload to Moodle.</li>
<li><b>Report during the exam.</b> Pings, queued log entries, network and power status, and any hand-raising or instructions.</li>
</ol>

<h2>Where SEB Server can run</h2>
<ul>
<li><b>It is software you host yourself.</b> I did not find a hosted service. Your central IT or learning-technology team may already run one.</li>
<li><b>Anywhere that runs Docker.</b> The official setup guide says only Docker-based installs are currently supported. The server and its web interface are one Java container, with a separate MariaDB database. It runs on Java 21 and is licensed under MPL-2.0.</li>
<li><b>Sizing.</b> The production guide uses the official MariaDB image with an nginx reverse proxy, and recommends about 4 cores, 32 GB of memory and 100 GB of disk. There is a lighter demo setup that needs only Docker and Docker Compose.</li>
<li><b>Reachable from students.</b> Their SEB must be able to reach the server's address over HTTPS. For students at home that means a public address with a valid certificate. For lab rooms, an address on the university network may be enough.</li>
<li><b>Where the data sits.</b> This affects your data protection position. Think about your own infrastructure or an approved UK or EU provider, retention rules and who can see recordings.</li>
</ul>

<h2>Firewalls, and what happens if SEB cannot connect</h2>
<p>Each student computer needs an outbound HTTPS connection to the server (nothing inbound). Screen proctoring, if used, has its own address and may need its own rule. These requests come from SEB itself, not from the browser, so I believe the website allow-list does not apply to them, but this is my reading of the code and worth testing. I did not check whether SEB uses a system proxy for them.</p>
<h3>Before the exam starts</h3>
<ul>
<li>If a request fails, SEB shows a dialog with <i>Retry</i> and <i>Abort</i>, and, if the configuration allows it, <i>Fallback</i>.</li>
<li>SEB keeps asking until a request succeeds or the student chooses, so a student behind a blocking firewall is stuck at that dialog.</li>
<li>Fallback starts SEB with the local start address and settings, without the server. The settings include a fallback password (<code>sebServerFallbackPasswordHash</code>), but I could not find where the Windows client checks it, so test that it is enforced before relying on it.</li>
<li>The number of retry attempts, the interval and the timeout are configurable.</li>
</ul>
<h3>During the exam</h3>
<ul>
<li>The exam keeps running. A failed ping only writes a warning to SEB's local log.</li>
<li>The student shows as disconnected on the server, and instructions such as lock or end do not arrive until the connection returns.</li>
<li>I did not check whether log entries from the gap are kept or lost.</li>
</ul>

<h2>Data protection</h2>
<p>This is not legal advice. Recording web activity, window titles and especially screenshots is personal data processing, and screenshots can capture private content. In the UK you would normally need a lawful basis, a clear notice to students, a data protection impact assessment, minimal data collection and a retention period. Choose the least invasive option that meets your need: blocked-site messages and a local log may be enough, and screenshots are the heaviest choice. As with other monitoring, expect students to be anxious about it, so explain what is collected and why.</p>

<h2>Before your first exam with SEB Server</h2>
<ol>
<li>Ask IT to allow outbound HTTPS to the server from every network students will use.</li>
<li>Test from a lab room, campus Wi-Fi, a home connection and any VPN.</li>
<li>Decide whether fallback is allowed, and who holds the fallback password.</li>
<li>Agree what invigilators do for a student who shows as disconnected.</li>
<li>Complete your data protection review and tell students what is recorded.</li>
<li>Run a practice session first. See the <a href="secure-exam-environments.html">guide to secure exam environments</a> for the wider picture.</li>
</ol>

<h2>Sources</h2>
<ul>
<li><a href="https://github.com/SafeExamBrowser/seb-server">SEB Server repository</a> (Java 21, MPL-2.0)</li>
<li><a href="https://seb-server-setup.readthedocs.io/en/latest/overview.html">SEB Server installation guide: overview</a>, <a href="https://seb-server-setup.readthedocs.io/en/latest/install-production.html">production setup</a> and <a href="https://seb-server-setup.readthedocs.io/en/latest/install-demo.html">demo setup</a></li>
<li><a href="https://github.com/SafeExamBrowser/seb-win-refactoring">SEB for Windows source code</a>: the server connection (<code>SafeExamBrowser.Server</code>) and the failure handling (<code>ServerOperation.cs</code> in <code>SafeExamBrowser.Runtime</code>)</li>
</ul>
''',
},
]

STUDENT_ARTICLES = [
{
 'audience': 'students',
 'slug': 'student-seb-exam-checklist',
 'title': 'Before your Safe Exam Browser exam: a student checklist',
 'seo_title': 'Safe Exam Browser exam checklist for students',
 'description': 'A short checklist for students sitting an exam in Safe Exam Browser: install it, test it, prepare your computer and know what to do if something goes wrong.',
 'summary': 'Install it, test it, and know who to ask, so exam day goes smoothly.',
 'body': '''
<p>Safe Exam Browser (SEB) is a locked-down web browser. It fills your screen, closes off other programs and websites, and opens only your exam. Most problems on the day come from things that could have been sorted out a few days earlier. Work through this list in good time.</p>
<p class="callout"><b>Your university’s instructions come first.</b> Every exam is set up differently. If this page disagrees with what your lecturer or exam office told you, follow them.</p>

<h2>A week before</h2>
<ul>
<li><b>Find your instructions.</b> They are usually on the course page or in the exam notice: which version of SEB to install, which computer types are allowed, and who to contact.</li>
<li><b>Install SEB from the official site.</b> Download it from <a href="https://safeexambrowser.org">safeexambrowser.org</a> or from the link your university gives you. Do not use download sites that bundle other software.</li>
<li><b>Use a computer you can rely on.</b> A laptop that is fully updated, has enough free disk space and can run for the whole exam. If your university supplies computers, find out where and when you can try one.</li>
<li><b>Do the practice quiz.</b> If there is one, sit it in SEB, start to finish. This is the single most useful thing you can do. It shows up installation, sign-in and network problems while there is still time to fix them.</li>
</ul>

<h2>The day before</h2>
<ul>
<li><b>Update, then leave it alone.</b> Install pending system updates now, not an hour before the exam.</li>
<li><b>Check your sign-in.</b> Make sure you can sign in to your university account and that you know where your approval prompts go. See <a href="student-seb-microsoft-sign-in.html">signing in to Microsoft inside SEB</a>.</li>
<li><b>Check your internet.</b> Use a connection you trust. A cable or a strong, close Wi-Fi signal is better than a shared or busy one.</li>
<li><b>Charge and plug in.</b> Bring the charger. Laptops that run out of battery mid-exam are the commonest avoidable problem.</li>
<li><b>Write down who to contact</b> and how, in case you cannot get into the exam: the exam office, the lecturer or the IT help desk.</li>
</ul>

<h2>Just before the exam</h2>
<ul>
<li><b>Close everything else.</b> SEB may refuse to start, or may ask you to close programs, if screen sharing, remote-access tools, virtual machines or other restricted programs are running. Save your work and close them.</li>
<li><b>Turn off what could interrupt you.</b> Notifications, chat apps, automatic updates and screen recorders.</li>
<li><b>Start from the right place.</b> Most Moodle exams have a <i>Launch Safe Exam Browser</i> button on the quiz page. If you open the quiz in an ordinary browser, Moodle tells you to use SEB.</li>
<li><b>Allow time.</b> Open SEB at least 15 minutes before the start so a slow start does not use up exam time.</li>
</ul>

<h2>During the exam</h2>
<ul>
<li><b>You cannot use other programs or websites</b> unless your instructions say you can. That is normal, not a fault.</li>
<li><b>Do not try to get around SEB.</b> Attempts to get round it can be flagged, and a problem caused by trying is much harder to put right than a plain technical fault.</li>
<li><b>Stay calm if something goes wrong.</b> Do not close SEB, restart or switch off unless you are told to. Put your hand up or contact the invigilator or exam office. Moodle usually saves your answers as you go, and your invigilator can tell you what happens to the clock.</li>
</ul>

<h2>When you finish</h2>
<ul>
<li>Submit your attempt in the quiz as the instructions say, and check the confirmation.</li>
<li>To leave SEB, use the <i>Exit Safe Exam Browser</i> button if the quiz page shows one, or the quit button in SEB. You may need a quit password, which the invigilator gives you. See <a href="student-seb-wont-start-or-quit.html">if SEB won’t start or won’t quit</a>.</li>
</ul>

<h2>If you cannot use SEB</h2>
<p>Tell your university well before the exam. If you have an accessibility need, a computer that cannot run SEB or any other reason, there is usually an alternative arrangement, but only if they know in time.</p>
''',
},
{
 'audience': 'students',
 'slug': 'student-seb-wont-start-or-quit',
 'title': 'Safe Exam Browser won’t start, won’t quit or has frozen: what to do',
 'seo_title': 'Safe Exam Browser won’t start or won’t quit',
 'description': 'What to do when Safe Exam Browser will not open, will not let you quit, asks for a password or freezes during an exam, and what to tell the invigilator.',
 'summary': 'Won’t open, won’t close, asks for a password or has frozen: calm steps for each.',
 'body': '''
<p>Most Safe Exam Browser (SEB) problems have a simple cause. The golden rule: <b>if something goes wrong during an exam, tell your invigilator or exam contact before you do anything drastic.</b> Do not switch the computer off or restart it unless you are told to.</p>
<p class="callout"><b>Your university’s instructions come first.</b> Settings vary between exams, so these steps are general. Where they differ from your instructions, follow your instructions.</p>

<h2>SEB won’t start</h2>
<ol>
<li><b>Start it the way you were told.</b> For Moodle exams that normally means opening the quiz and using the <i>Launch Safe Exam Browser</i> button. Double-clicking SEB on its own may open an empty window or an error.</li>
<li><b>Read the message.</b> SEB often tells you what is wrong. Common causes are in the next steps.</li>
<li><b>Close other programs.</b> Screen sharing, remote-desktop and screen-recording tools, virtual machines and some chat or overlay programs can stop SEB starting. Save your work, close them, and try again.</li>
<li><b>Check your version.</b> If the exam asks for a minimum SEB version, an old copy will be refused. Install the latest from <a href="https://safeexambrowser.org">safeexambrowser.org</a> or your university’s link.</li>
<li><b>Check your network.</b> A message about a server or connection means SEB or the exam site cannot be reached. Test another website in your normal browser, move closer to the router or switch network.</li>
<li><b>Restart SEB, then the computer</b>, if you are doing this before the exam and have time. A fresh start clears many faults.</li>
<li><b>Still stuck?</b> Take a screenshot or photograph of the message with your phone and contact the IT help desk or exam office. The exact words help them a great deal.</li>
</ol>

<h2>I started the exam, but the page won’t load</h2>
<ul>
<li>Wait a minute. Exam sites can be slow when many students start together.</li>
<li>Try the page’s own reload button or key, in case your instructions say you can.</li>
<li>If the page still will not load, tell the invigilator at once. Say the time and what you see.</li>
</ul>

<h2>SEB has frozen</h2>
<ul>
<li>Wait about a minute, since a heavy page can look frozen.</li>
<li>Do not press lots of keys or force the computer off. Put your hand up or contact the exam office.</li>
<li>If you are told to close and reopen SEB, re-launch the quiz from Moodle. Moodle normally saves your answers as you go and lets you carry on with the attempt that is still open, but how the timer is treated is your university’s decision, so ask.</li>
</ul>

<h2>SEB won’t let me quit</h2>
<p>That is deliberate. Depending on how the exam is set up, you leave in one of these ways:</p>
<ul>
<li><b>An exit button on the quiz page.</b> Some Moodle exams show <i>Exit Safe Exam Browser</i> once you have finished your attempt. It does not appear before that.</li>
<li><b>The quit button in SEB,</b> which asks for a quit password. The invigilator gives you the password at the end. Do not share it.</li>
<li><b>Ctrl+Q on Windows or Cmd+Q on a Mac,</b> which also asks for the password when one is set.</li>
</ul>
<p>If none of these works, tell the invigilator. Do not try to end SEB by other means before the exam has finished and you have been told you can leave.</p>

<h2>It asks for a password I don’t know</h2>
<ul>
<li>A <b>quit password</b> is given by your invigilator or lecturer. You will not be able to find it online, and it may be different for each exam.</li>
<li>A <b>password to sign in</b> (your university account) is your own. See <a href="student-seb-microsoft-sign-in.html">signing in to Microsoft inside SEB</a>.</li>
</ul>

<h2>What to tell the invigilator or help desk</h2>
<ul>
<li>Your name, the exam and the time the problem started.</li>
<li>What you were doing and what you saw. The exact wording of any message helps.</li>
<li>Your computer type (Windows, Mac or iPad) and SEB version, if you know it.</li>
<li>A photo of the screen, if you can take one.</li>
</ul>

<h2>Prevent it next time</h2>
<p>Run through the <a href="student-seb-exam-checklist.html">student checklist</a>, and do a practice quiz in SEB if there is one.</p>
''',
},
{
 'audience': 'students',
 'slug': 'student-seb-microsoft-sign-in',
 'title': 'Signing in to Microsoft inside Safe Exam Browser: what students need to know',
 'seo_title': 'Microsoft sign-in in Safe Exam Browser for students',
 'description': 'Why sign-in with a university Microsoft account can behave differently inside Safe Exam Browser, how phone approval compares with passkeys, and how to test it before your exam.',
 'summary': 'Why Microsoft sign-in can behave differently in SEB, and how to be ready.',
 'body': '''
<p>Many universities use a Microsoft account to sign in to Moodle and other exam systems. Signing in inside Safe Exam Browser (SEB) can behave differently from signing in with your usual browser, and it is a common place for problems to appear. A little preparation avoids nearly all of them.</p>
<p class="callout"><b>Your university’s instructions come first.</b> The sign-in methods allowed in SEB are chosen by whoever set up your exam.</p>

<h2>Why it can be different</h2>
<p>SEB blocks other programs, and some sign-in methods rely on separate programs or system windows. For example, signing in with a fingerprint, face recognition, a PIN or a passkey makes Windows open its own sign-in window, which SEB can interfere with unless the exam has been set up to allow it. Approving a sign-in on your phone works the same way in SEB as anywhere else, because the phone does the work.</p>

<table>
<tr><th>How you sign in</th><th>In SEB</th></tr>
<tr><td>Password plus an approval on your phone (authenticator app)</td><td>Usually the most reliable. Have your phone charged and with you.</td></tr>
<tr><td>Windows Hello (face, fingerprint, PIN) or a passkey on Windows</td><td>Works only if the exam allows it. Test it first.</td></tr>
<tr><td>A passkey or security key on a Mac or iPad</td><td>May not work in SEB. Use phone approval instead if you can.</td></tr>
<tr><td>A code texted to your phone</td><td>Normally fine, if your phone has a signal.</td></tr>
</table>

<h2>What to do before the exam</h2>
<ol>
<li><b>Do the practice quiz</b> in SEB, signing in the same way you will on the day. If you cannot sign in, tell the exam office then, while it can still be fixed.</li>
<li><b>Know your method.</b> Check in your account’s security settings which sign-in methods you have set up. Having a phone approval or authenticator app as a backup is a good idea.</li>
<li><b>Keep your phone ready.</b> Charged, with a signal, and with the authenticator app working. Check your exam rules about phones: some allow a phone for sign-in only, others want it away from you after you sign in.</li>
<li><b>Sign in well before the start time.</b> If your session is already open when the exam starts, you may not be asked again. Do not rely on that.</li>
</ol>

<h2>If sign-in fails in SEB</h2>
<ul>
<li>Read the message, and try again slowly. A mistyped password or a prompt you missed on your phone is the usual reason.</li>
<li>If a window you expected does not appear (for example a Windows Hello or passkey prompt), choose the option to <b>sign in another way</b> and use your phone or a code.</li>
<li>If you are locked out or cannot get any option to work, tell the invigilator or help desk straight away. Say which method you tried and what appeared.</li>
<li><b>Never ask someone else to sign in for you</b>, and do not share your password or codes. That counts as breaking the exam rules.</li>
</ul>

<h2>A quick note on privacy</h2>
<p>SEB works with the sign-in pages your exam site gives it. It does not add its own sign-in, and your password is typed on the same Microsoft page as usual. If you have doubts about what is recorded during your exam, ask your university: it is their decision and their policy.</p>

<h2>More help</h2>
<p>See the <a href="student-seb-exam-checklist.html">student checklist</a>, and <a href="student-seb-wont-start-or-quit.html">what to do if SEB won’t start or quit</a>.</p>
''',
},

{
 'audience': 'students',
 'slug': 'risks-of-cheating-safe-exam-browser',
 'title': 'Cheating in a Safe Exam Browser exam: the risks to you',
 'seo_title': 'The risks of cheating in a Safe Exam Browser exam',
 'description': 'What can happen to students who cheat or try to get around Safe Exam Browser: academic misconduct penalties, how it gets noticed, the dangers of bypass tools, and what to do instead.',
 'summary': 'What is really at stake, how cheating gets noticed, and what to do if you are struggling.',
 'body': '''
<p>Students searching for ways around Safe Exam Browser (SEB) often assume the worst that can happen is a bad mark. The real risks are much larger, and some of them have nothing to do with your university. This page is about those risks. It does not explain how to get round SEB, and nothing here is a challenge to try.</p>
<p class="callout"><b>Your university’s regulations come first.</b> Penalties and procedures differ between institutions. Read your own academic misconduct policy and your exam instructions.</p>

<h2>What academic misconduct can cost you</h2>
<p>Universities treat cheating in an exam as serious academic misconduct. Depending on the case and the institution, outcomes can include:</p>
<ul>
<li>a mark of zero for the exam or the whole module, even if you had passed it honestly;</li>
<li>having to retake a module, or a capped mark on a resit;</li>
<li>a formal warning or a note on your student record;</li>
<li>suspension, or being removed from your programme;</li>
<li>for a degree that leads to a profession (such as medicine, teaching, law, engineering or nursing), a misconduct finding that you may have to declare to a professional body later;</li>
<li>for students on a visa, serious trouble that can follow from losing your place.</li>
</ul>
<p>A record of misconduct can also surface in references and fitness-to-practise checks long after you have left.</p>

<h2>How cheating gets noticed</h2>
<p>SEB is only one layer, and it does not claim to catch everything. Universities use several things together, and a plan that works against one often fails against another:</p>
<ul>
<li><b>Server-side checks.</b> Moodle can require that the exam is opened in a genuine, correctly configured SEB, and it keeps logs of each attempt: when you logged in, how you moved through the quiz, how long each question took, and from which network address.</li>
<li><b>Invigilators.</b> In a room, or by webcam, people are watching, and they know what a normal exam looks like.</li>
<li><b>Looking at the answers afterwards.</b> Similar wrong answers, answers that match another student’s order of mistakes, text that does not sound like your usual writing, or a sudden jump in marks can all be flagged for review. Question banks that give each student different questions in a different order make copying easier to spot.</li>
<li><b>Other students.</b> Cheating that involves a second person, a group chat or a paid service leaves messages and payments behind, and people talk.</li>
<li><b>Later reports.</b> Cases are sometimes reopened months afterwards when new evidence appears.</li>
</ul>
<p>Not every case is caught, and nobody should claim otherwise. But “most people won’t notice” is a poor bet when the stakes are your degree.</p>

<h2>The hidden risk: “bypass” tools and services</h2>
<p>Searches for ways around exam software lead to videos, forum posts, downloadable programs and paid “services”. Many of these are dangerous in ways that have nothing to do with the exam:</p>
<ul>
<li><b>Malware.</b> Programs that promise to disable exam software are a well-known way to spread password-stealing and remote-access malware. Installing one can give a stranger control of the computer that holds your coursework, photos and bank logins.</li>
<li><b>Stolen accounts.</b> Anything that asks for your university login can use it to read your email and files, or to sell the account.</li>
<li><b>Scams and blackmail.</b> Paid “exam help” and contract-cheating services often take the money and disappear. Some then threaten to report you to your university unless you pay again.</li>
<li><b>A trail.</b> Your payment, your messages and your downloaded files are evidence that you chose to cheat.</li>
</ul>

<h2>Using AI to answer exam questions</h2>
<p>If an exam does not allow generative AI, using it is cheating, whichever way you reach it. It is also a poor tactic: AI answers can be confidently wrong, they often look alike from one student to the next, and they will not teach you what the next module assumes you know.</p>

<h2>Also worth knowing</h2>
<ul>
<li><b>A fault is not cheating.</b> If SEB or your internet fails, say so straight away. The invigilator and exam office deal with this often, and being honest is always better. See <a href="student-seb-wont-start-or-quit.html">what to do if SEB won’t start or quit</a>.</li>
<li><b>Trying to cheat can be treated as misconduct even if it fails.</b> Many regulations cover an attempt, not only a result.</li>
<li><b>Helping someone else cheat counts too.</b> Sharing the quit password, passing answers on or sitting an exam for a friend are all covered.</li>
</ul>

<h2>If you feel you can’t cope</h2>
<p>Most cheating comes from pressure: a missed deadline, fear of failing, family or health trouble. There are almost always better options, and they are quicker to arrange than most people think:</p>
<ul>
<li><b>Tell your university early.</b> Ask about extensions, mitigating circumstances, deferring the exam or a resit. These routes exist because everyone has a bad term sometimes.</li>
<li><b>Ask for help with the subject.</b> Lecturers, tutors, peer support and academic skills services.</li>
<li><b>Ask for a wellbeing or disability adjustment</b> if you need extra time, a different room or other arrangements.</li>
<li><b>If you have already done something you regret,</b> speak to your personal tutor or a student advice service (many are run by the students’ union) before an investigation starts. Admitting a problem early is usually treated more favourably than being found out.</li>
</ul>

<h2>Getting ready the honest way</h2>
<p>Run through the <a href="student-seb-exam-checklist.html">student checklist</a> and do a practice quiz in SEB. Confident preparation is the best protection against both technical problems and the temptation to take a risk.</p>
''',
},
{
 'audience': 'staff',
 'slug': 'what-safe-exam-browser-can-and-cannot-protect',
 'title': 'What Safe Exam Browser can and cannot protect',
 'seo_title': 'What Safe Exam Browser can and cannot protect',
 'description': 'A threat-by-threat look at what Safe Exam Browser stops, what it only makes harder and what it cannot touch, from other programs and websites to second devices and AI.',
 'summary': 'A threat-by-threat table: what SEB stops, what it only slows, and what is out of its reach.',
 'body': '''
<p>Staff are often asked “does SEB stop cheating?”. The honest answer depends on the threat. This guide goes through the common ones, grouped by how much SEB helps. For the wider picture, including the research, see <a href="secure-exam-environments.html">secure exam environments</a>.</p>
<p class="callout"><b>Settings matter.</b> What SEB does depends on how the <code>.seb</code> file is configured and on the operating system. Test your own file (see <a href="test-run-safe-exam-browser-exam.html">how to do a test run</a>) rather than assuming.</p>

<h2>What SEB is good at</h2>
<table>
<tr><th>Threat</th><th>What SEB does</th></tr>
<tr><td>Student opens another program on the exam computer (notes, chat, a calculator you have not allowed)</td><td>Runs full screen and, with the usual settings, stops other programs being started or used. You can allow named programs.</td></tr>
<tr><td>Student opens other websites in the same browser</td><td>The URL filter blocks pages that are not on your allow list. See <a href="seb-url-filter-moodle.html">the URL filter guide</a>.</td></tr>
<tr><td>Copy and paste to or from other applications</td><td>Can be limited to inside the exam, or blocked.</td></tr>
<tr><td>Screenshots, screen sharing and screen recording of the exam</td><td>Settings exist to block them (for example <code>allowScreenCapture</code> and <code>allowScreenSharing</code>). Check they behave as you expect on each operating system.</td></tr>
<tr><td>Running the exam inside a virtual machine</td><td>Settings exist to refuse to start in one (<code>allowVirtualMachine</code>). A determined student may still get round this, so treat it as a hurdle.</td></tr>
<tr><td>Printing, saving and sharing exam pages</td><td>Can be switched off.</td></tr>
<tr><td>Students wandering off through the Moodle menus</td><td>Block the Moodle areas you do not want. See <a href="block-generative-ai-safe-exam-browser.html">keeping students inside the quiz</a>.</td></tr>
</table>

<h2>What SEB makes harder, but does not stop</h2>
<table>
<tr><th>Threat</th><th>Why it is only partly covered</th></tr>
<tr><td>Altered or old copies of SEB</td><td>Moodle can check the keys that SEB sends, and you can set a minimum SEB version. But the keys are calculated from the settings file, so someone who has the file can in principle work them out. The keys raise the bar for casual attempts. They are not a strong guarantee. See <a href="secure-exam-environments.html">the research summary</a>.</td></tr>
<tr><td>Students finding a way into blocked sites</td><td>A URL filter blocks by address. New AI sites, mirrors and proxies appear all the time, which is why an allow list is better than a block list.</td></tr>
<tr><td>Sharing the quit password</td><td>A password given to the room can be passed on. Hand it out only as students finish, or use the quit-link route.</td></tr>
<tr><td>Students on their own computers</td><td>You control what SEB does, not what is installed underneath. A managed lab computer is much easier to trust than a personal laptop.</td></tr>
</table>

<h2>What SEB cannot do</h2>
<ul>
<li><b>See or control a second device.</b> A phone, tablet or other laptop beside the exam computer is out of reach, including for AI assistants. This is the biggest gap.</li>
<li><b>Stop help from another person</b> in the room, on a call or through a message.</li>
<li><b>Know who is sitting the exam.</b> It does not check identity. Moodle sign-in, invigilators or proctoring must do that.</li>
<li><b>Detect cheating by itself.</b> By default it does not record what a student types or sees. Logging student activity needs <a href="seb-server-logging-hosting-firewalls.html">SEB Server</a> and has privacy consequences.</li>
<li><b>Fix a badly designed exam.</b> Questions that can be answered by lookup are the same questions under lockdown. <a href="secure-exam-environments.html">Assessment design</a> does more than any setting.</li>
<li><b>Protect the exam outside SEB.</b> If the quiz can also be opened in a normal browser, it is not protected. Moodle’s SEB requirement is what enforces this. A hidden quiz alone does not.</li>
</ul>

<h2>A sensible way to use it</h2>
<ol>
<li>Use SEB for what it does well: close off the exam computer and the open web.</li>
<li>Add the layers it cannot give you: invigilation or proctoring, randomised questions, time limits and questions that ask for reasoning.</li>
<li>Tell students what is and is not allowed, and give them a way to ask for help. See the <a href="students.html">student guides</a>.</li>
<li>Run a <a href="test-run-safe-exam-browser-exam.html">test run</a> on every type of computer before the real exam.</li>
</ol>
''',
},
{
 'audience': 'staff',
 'slug': 'test-run-safe-exam-browser-exam',
 'title': 'How to do a test run of your Safe Exam Browser exam',
 'seo_title': 'How to test a Safe Exam Browser exam before the real one',
 'description': 'A step-by-step test run for a Safe Exam Browser exam in Moodle: test as a student, try every computer type, check blocked and allowed sites, sign-in, quitting and what happens when things fail.',
 'summary': 'Test as a student, on every computer type, with a go or no-go checklist before exam day.',
 'body': '''
<p>The best protection against exam-day problems is a proper rehearsal. This guide describes a test run for a Moodle quiz in Safe Exam Browser (SEB). Allow a few days for it, so you can fix what you find.</p>

<h2>1. Test as a student, not as a teacher</h2>
<p>This is the step people miss. In Moodle, teachers and managers usually have a permission that lets them bypass the Safe Exam Browser requirement, so a quiz that opens fine for you in a normal browser may be locked to everyone else. Check this on your own installation, then:</p>
<ul>
<li>Make a <b>test student account</b>, enrol it in the course and use it for every test. A separate, real test account is the most reliable way to see what students see.</li>
<li>Use a <b>copy of the quiz</b> with the same settings, in a test course or with access limited to your test users, so real students do not see it.</li>
</ul>

<h2>2. Cover every kind of computer</h2>
<p>Try the exam on each combination students will use, and record the result for each.</p>
<table>
<tr><th>Computer</th><th>Check</th></tr>
<tr><td>A lab or cluster computer</td><td>SEB installed, correct version, launches from the quiz page.</td></tr>
<tr><td>Windows laptop (BYOD)</td><td>Fresh install of the current SEB; Windows Hello or phone sign-in if used.</td></tr>
<tr><td>Mac</td><td>SEB in the Applications folder; sign-in method that works on a Mac.</td></tr>
<tr><td>iPad, if allowed</td><td>The App Store version; settings that apply only to some systems.</td></tr>
<tr><td>A computer with the quirks you expect</td><td>Two screens, a managed laptop with a firewall or proxy, a slow connection.</td></tr>
</table>

<h2>3. The checklist for each test</h2>
<ol>
<li><b>Start.</b> The quiz launches from the <i>Launch Safe Exam Browser</i> button. Opening the quiz in a normal browser is refused.</li>
<li><b>Sign in.</b> The method students will really use works, including the phone approval prompt. See <a href="microsoft-sign-in-safe-exam-browser.html">Microsoft sign-in in SEB</a>.</li>
<li><b>Allowed.</b> Everything the exam needs works: question types, images, embedded video, equation tools, file uploads, any other site you allowed.</li>
<li><b>Blocked.</b> Pages you meant to block are blocked: another website, the Moodle dashboard and menu, a link inside a question. Try the address bar if you enabled one. Use the <a href="../#test">website test in the builder</a> to check a list of addresses.</li>
<li><b>Windows.</b> The quiz stays in one window, and a link that asks for a new window does not escape your rules. Check the quiz's Moodle browser security is <i>None</i>.</li>
<li><b>Programs and keyboard.</b> Another application cannot be opened, and copy and paste behaves as you set it.</li>
<li><b>Downloads and uploads.</b> Where files go, and whether a student can find them to upload. See <a href="download-upload-files-safe-exam-browser.html">downloads and uploads</a>.</li>
<li><b>Finish and quit.</b> Submit, then leave by your intended route: quit password, <i>Exit Safe Exam Browser</i> button or quit link. Check that quitting during the attempt is not possible if you do not want it to be.</li>
<li><b>Review.</b> Look at the attempt as a teacher: answers saved, time recorded, anything strange in the logs.</li>
</ol>

<h2>4. Try the things that go wrong</h2>
<ul>
<li><b>Network drops.</b> Turn Wi-Fi off for 30 seconds, then on. Does the quiz recover, and are answers kept?</li>
<li><b>Restart.</b> Close SEB mid-attempt and re-launch from Moodle. Does the attempt continue, and what happens to the timer?</li>
<li><b>Wrong or old SEB.</b> Install an older version or open the quiz with a different browser. Is the message clear, and does your server refuse it?</li>
<li><b>Closed programs.</b> Start with screen sharing or a restricted program running. What does a student see?</li>
<li><b>Accessibility.</b> Try the tools your students use (screen reader, magnification, extra time). Some assistive tools conflict with lockdown, so find out in advance.</li>
</ul>

<h2>5. Pilot with a few real students</h2>
<p>A practice quiz in SEB, taken by real students on their own computers about a week before the exam, finds problems that you cannot. Ask them to report their computer type, the SEB version and anything odd. Give them the <a href="students.html">student guides</a> and the <a href="student-seb-exam-checklist.html">student checklist</a>.</p>

<h2>6. Rehearse the room</h2>
<ul>
<li>Run through the invigilator sheet (the builder makes one) with the people who will use it.</li>
<li>Know who handles a student who cannot start, and what the options are: another computer, another room, or an alternative arrangement.</li>
<li>Decide in advance how the clock is handled when something fails.</li>
</ul>

<h2>7. Go or no-go, and freeze</h2>
<ul>
<li>Note the SEB versions you tested and the <code>.seb</code> file you used. Keep a copy.</li>
<li><b>Freeze the settings</b> a day or two before. A change after testing is an untested change.</li>
<li>If a core test failed on a main computer type, fix it or use another route. Do not hope it works on the day.</li>
<li>Keep a plan B: a spare computer, a paper copy or a second room.</li>
</ul>

<p>Related: <a href="what-safe-exam-browser-can-and-cannot-protect.html">what SEB can and cannot protect</a>, and <a href="make-seb-config-file-moodle.html">making the settings file</a>.</p>
''',
},
{
 'audience': 'students',
 'slug': 'student-what-can-seb-see',
 'title': 'What can Safe Exam Browser see on my computer?',
 'seo_title': 'What can Safe Exam Browser see on my computer?',
 'description': 'A plain answer for students: what Safe Exam Browser does on your computer during an exam, what it can and cannot see, what the exam system may record, and how to ask your university.',
 'summary': 'What SEB does, what it does not do, and what your university may record.',
 'body': '''
<p>Students often worry about installing exam software. This page explains what Safe Exam Browser (SEB) does on your computer, what it does not do, and what could be recorded. The exact answers depend on how your university set up your exam, so there is also a list of questions to ask them.</p>
<p class="callout"><b>Your university’s policies come first.</b> This is general information, not a statement about your university’s system.</p>

<h2>What SEB does</h2>
<ul>
<li>It is a web browser that fills your screen and opens your exam.</li>
<li>During the exam it blocks other programs, other websites and some keyboard shortcuts, as the exam settings say.</li>
<li>It can stop screenshots, screen sharing and copy and paste to other programs.</li>
<li>It can show your university’s exam system that you are using SEB with the right settings.</li>
</ul>

<h2>What SEB does not normally do</h2>
<ul>
<li>It is not a general “spy” program. It runs while you are in the exam and ends when you quit.</li>
<li>By default it does not read your files, your photos, your emails or your browsing history.</li>
<li>By default it does not turn on your webcam or microphone. That would need separate proctoring software, which you would be told about.</li>
<li>It does not change your computer permanently. You can uninstall it like any other program.</li>
</ul>

<h2>What could be recorded</h2>
<p>This depends on your university’s setup, so treat the list as possibilities, not promises.</p>
<ul>
<li><b>The exam system’s records.</b> Moodle and similar systems keep logs of attempts: when you signed in, how you moved through the quiz, and your answers.</li>
<li><b>SEB’s own log.</b> SEB can keep a log on your computer, which you or your university can use to diagnose problems.</li>
<li><b>An exam server.</b> Some universities use an exam server that receives status messages, such as whether your computer is connected or about to run out of battery. Some can also take screenshots and record the active program or window title. If yours does, you should be told in advance.</li>
<li><b>A webcam or invigilator.</b> If your exam is supervised remotely, you will be told.</li>
</ul>

<h2>What to ask your university</h2>
<ul>
<li>What is recorded during the exam, and who can see it?</li>
<li>How long is it kept, and where?</li>
<li>Is there a webcam, microphone or screen recording, and what happens to it?</li>
<li>What can I use instead if I cannot or do not wish to install SEB on my own computer?</li>
</ul>
<p>Universities that record data about you have to tell you what they collect and why (your data-protection notice). Ask the exam office or the data-protection team.</p>

<h2>Practical tips</h2>
<ul>
<li>Install SEB only from <a href="download-students.html">the official sources</a>.</li>
<li>If you do not want to install it on a personal computer, ask early about using a university computer.</li>
<li>Uninstall it after your exams if you do not need it. If you have another exam later, keep it and update it.</li>
</ul>
<p>See also <a href="student-seb-exam-checklist.html">the student checklist</a>.</p>
''',
},
{
 'audience': 'students',
 'slug': 'download-students',
 'title': 'Download Safe Exam Browser: student downloads and installation',
 'seo_title': 'Download Safe Exam Browser for students',
 'description': 'Where students get Safe Exam Browser for Windows, Mac and iPad: official download links, how to check you have the right version, installing it safely and what to do if you cannot.',
 'summary': 'Official links for Windows, Mac and iPad, and how to install and check it.',
 'body': '''
<p>You only need to install Safe Exam Browser (SEB) once, and update it when your exam asks for a newer version. Download it from the official project or the link your university gives you. <b>This site does not host SEB</b>: that way you always get the real, current build from its makers.</p>
<p class="callout"><b>Your university’s instructions come first.</b> If they name a version or give you a different link, use theirs.</p>

<h2>Official downloads</h2>
<table>
<tr><th>Computer</th><th>Where to get it</th><th>Notes</th></tr>
<tr><td>Windows 10 or 11</td><td><a href="https://safeexambrowser.org/download_en.html">safeexambrowser.org/download_en.html</a></td><td>Download the installer from the official page, then run it. As of 26 November 2026 the page lists version 3.10.3.</td></tr>
<tr><td>Mac</td><td><a href="https://safeexambrowser.org/download_en.html">safeexambrowser.org/download_en.html</a></td><td>A disk image. As of 26 November 2026 the page lists version 3.7.2. Newer macOS versions need a recent SEB, so update before the exam.</td></tr>
<tr><td>iPad and iPhone</td><td>The <a href="https://itunes.apple.com/app/safeexambrowser/id1155002964">App Store</a></td><td>Check with your university that iPad is allowed for your exam. Some features differ.</td></tr>
</table>
<p>Version numbers change, so check <a href="https://safeexambrowser.org/download_en.html">the official page</a> for the current ones. I could not find an official Linux or Chromebook version on that page. If you use one of those, ask your university about a university computer or another route.</p>

<h2>Installing</h2>
<ol>
<li><b>Windows:</b> run the installer, accept the prompts and restart if asked.</li>
<li><b>Mac:</b> open the disk image and drag SEB into the main <b>Applications</b> folder. Leaving it in Downloads or a user folder can stop it starting.</li>
<li><b>iPad:</b> install it from the App Store.</li>
<li>Do not start the exam from inside SEB yet. Start it from your exam page, using the launch button or link your university gives you.</li>
</ol>

<h2>Check you got the real one</h2>
<ul>
<li>Download only from safeexambrowser.org, the App Store or your university. Do not use other download sites or “bundles”.</li>
<li>The official page lists a checksum for the Windows and Mac downloads. You can compare it with your file if you know how, but it is not needed for most people.</li>
<li>Be wary of anything that says it can “unlock” or “bypass” SEB. See <a href="risks-of-cheating-safe-exam-browser.html">the risks of cheating</a>.</li>
</ul>

<h2>After installing</h2>
<ul>
<li>Do the practice quiz, if there is one.</li>
<li>Run through the <a href="student-seb-exam-checklist.html">student checklist</a>.</li>
<li>If something fails, see <a href="student-seb-wont-start-or-quit.html">what to do if SEB won’t start</a>.</li>
</ul>
''',
},
{
 'audience': 'staff',
 'slug': 'download-staff',
 'title': 'Downloads for staff: Safe Exam Browser, SEB Server and tools',
 'seo_title': 'Safe Exam Browser downloads and tools for staff',
 'description': 'Where staff get Safe Exam Browser for Windows, Mac and iPad, SEB Server, the Moodle plugin and the SEB Config Builder, plus how to roll it out and check versions.',
 'summary': 'Official SEB downloads, SEB Server and Moodle plugin, plus the builder and printable sheets.',
 'body': '''
<p>This page lists where staff get Safe Exam Browser (SEB) and related tools. The SEB programs come from the official project; this site links to them and does not host them.</p>

<h2>Safe Exam Browser</h2>
<table>
<tr><th>Platform</th><th>Source</th><th>Listed version (26 Nov 2026)</th></tr>
<tr><td>Windows 10 (1803 or later) and 11</td><td><a href="https://safeexambrowser.org/download_en.html">Official download page</a> (installer from GitHub or Codeberg)</td><td>3.10.3</td></tr>
<tr><td>macOS</td><td><a href="https://safeexambrowser.org/download_en.html">Official download page</a> (disk image on GitHub)</td><td>3.7.2</td></tr>
<tr><td>iOS / iPadOS</td><td><a href="https://itunes.apple.com/app/safeexambrowser/id1155002964">App Store</a></td><td>3.7.2</td></tr>
</table>
<p>The official page also has <a href="https://safeexambrowser.org/download_releases_en.html">former releases</a>, checksums for Windows and Mac, and an integrity checker, the SEB Verificator. Versions change often, so check the page before each term. Apple’s signing certificate updates have affected older Mac versions on newer macOS releases, so update Macs before an exam period.</p>

<h2>For servers and learning systems</h2>
<ul>
<li><b>Moodle:</b> the Safe Exam Browser quiz access rule has been built into Moodle since version 3.9. The official page also lists a <a href="https://github.com/moodleou/moodle-quizaccess_safeexambrowser">plugin on GitHub</a> for older versions.</li>
<li><b>ILIAS:</b> a <a href="https://github.com/hrz-unimr/Ilias.SEBPlugin">plugin</a> is listed on the official page.</li>
<li><b>SEB Server:</b> no download on the official page. It links to the <a href="https://github.com/SafeExamBrowser/seb-server">SEB Server project on GitHub</a>. You run your own instance or use a provider. See <a href="seb-server-logging-hosting-firewalls.html">logging, hosting and firewalls</a>.</li>
<li><b>Autologin plugin for Moodle:</b> <a href="https://github.com/ethz-let/moodle-quizaccess_seb_autologin">moodle-quizaccess_seb_autologin</a>. Check how it fits your sign-in method.</li>
</ul>

<h2>Tools on this site</h2>
<ul>
<li><a href="../">SEB Config Builder</a>: makes the <code>.seb</code> settings file, tests which websites the exam uses, and makes printable information sheets for students, invigilators and IT.</li>
<li><a href="students.html">Student guides</a> you can link from quiz instructions.</li>
</ul>

<h2>Rolling it out</h2>
<ol>
<li><b>Choose a supported version</b> and say which one in your student instructions.</li>
<li><b>Lab computers:</b> install the same version on every computer or add it to the image, then test the file on one.</li>
<li><b>Students’ own computers:</b> link to <a href="download-students.html">the student download page</a> and ask them to install by a date.</li>
<li><b>Test before the exam:</b> see <a href="test-run-safe-exam-browser-exam.html">how to do a test run</a>.</li>
<li><b>Keep records:</b> the versions you tested and the exact settings file.</li>
</ol>
<p>Version details were read from the official page on 26 November 2026. Confirm them before you rely on them.</p>
''',
},
{
 'audience': 'staff',
 'slug': 'one-student-cannot-use-safe-exam-browser',
 'title': 'When one student cannot use Safe Exam Browser: what the invigilator can do',
 'seo_title': 'One student cannot use Safe Exam Browser: options for invigilators',
 'description': 'What to do when a single student has a Safe Exam Browser problem in a Moodle exam: fix it, swap the computer, or run them with manual invigilation using a duplicate quiz or a per-student bypass role.',
 'summary': 'Fix it, swap the computer, or run one student with manual invigilation, with two Moodle ways tested.',
 'body': '''
<p>In every large SEB exam, one student's computer fails. You need a plan that is quick, fair and does not weaken the exam for everyone else. This guide gives the options in order of preference. The two Moodle routes in option 3 were tried on a test Moodle 4.5 site; see <a href="#tested">what was tested</a> for the limits.</p>

<h2>1. Try to fix it (a few minutes)</h2>
<ul>
<li>Check the usual causes: SEB opened on its own instead of from the quiz, another program running (screen sharing, a virtual machine), or an old SEB version. See <a href="student-seb-wont-start-or-quit.html">what students are told to try</a>.</li>
<li>Close SEB and launch again from Moodle. Moodle normally lets the student carry on with the same attempt.</li>
<li>Note the time and the exact message on screen.</li>
</ul>

<h2>2. Move them to another computer (the best fallback)</h2>
<ul>
<li>Use a spare lab computer or loan laptop that already has the right SEB and has been tried with this exam.</li>
<li>The student keeps the full SEB protection, and nothing about the exam changes.</li>
<li>Keep one or two spare machines ready. It solves most cases.</li>
</ul>

<h2>3. Run them without SEB, with you as the control</h2>
<p>Use this only if someone can watch the student throughout, and only with your exam office's agreement. Two Moodle routes worked:</p>
<h3>Route A: a duplicate quiz with SEB off, limited to one student</h3>
<ol>
<li>Duplicate the quiz (or make a copy with the same questions) and set <i>Require the use of Safe Exam Browser</i> to <i>No</i>.</li>
<li>Under <i>Restrict access</i>, add a <b>Group</b> restriction and use a group that contains only that student. Hide it from everyone else (the eye icon).</li>
<li>Check by viewing the course as another student, or with a test account, that they cannot see it.</li>
</ol>
<p>The real quiz is untouched. The cost is a second quiz with its own attempts and results to merge afterwards. A restriction by profile field (username) did not work in my test, whereas a group did, so use a group.</p>
<h3>Route B: a bypass role for one student, on the same quiz</h3>
<ol>
<li>As an administrator, create a role that is available at <b>activity</b> level and allow only the permission <code>quizaccess/seb:bypassseb</code>. Don't reuse the teacher role, which gives other powers.</li>
<li>In the quiz, open <i>Permissions</i> and assign that role to the one student.</li>
<li>Afterwards, remove the role from the student.</li>
</ol>
<p>The student then opens the same quiz in an ordinary browser, while every other student is still held to SEB. By default only managers and editing teachers have that permission, which is why a teacher can open a quiz without SEB.</p>

<h3>Add controls for the room</h3>
<p>Without SEB nothing locks the computer, so you have to. Use several of:</p>
<ul>
<li>the quiz <b>password</b>, which you give them in the room;</li>
<li><b>Require network address</b> so the quiz opens only from the exam room;</li>
<li>a university computer where you can see the screen, with other programs closed;</li>
<li>a seat where you can watch, and a phone out of reach.</li>
</ul>

<h2>4. Other options</h2>
<ul>
<li>A paper or oral version, or deferring the sitting, if your regulations allow.</li>
<li>A different <code>.seb</code> file for that student, for example one that permits the Windows Hello sign-in programs. Moodle takes one settings file per quiz, so this also needs a duplicate quiz.</li>
</ul>

<h2>Whatever you choose</h2>
<ul>
<li><b>Write it down:</b> the time, the student, the fault, what you changed and who agreed.</li>
<li><b>Settle the clock:</b> how much time they lost and what they get back.</li>
<li><b>Be consistent:</b> treat the next student with the same fault the same way.</li>
<li><b>Do not give the student the quit password</b> or tell them to switch off settings.</li>
<li><b>Tidy up:</b> hide or delete the duplicate quiz and remove the role afterwards.</li>
</ul>

<h2 id="tested">What was tested, and what was not</h2>
<p>On a local Moodle 4.5 site, with SEB set manually, I checked Moodle's access rule from the command line using a normal browser with no SEB headers:</p>
<table>
<tr><th>Check</th><th>Result</th></tr>
<tr><td>Live quiz with SEB required, two students</td><td>Both blocked</td></tr>
<tr><td>Route A: duplicate quiz, SEB off, group of one student</td><td>That student can see and open it; the other student cannot see it</td></tr>
<tr><td>Route B: bypass role assigned to one student</td><td>That student allowed; the other still blocked</td></tr>
</table>
<p><b>Not tested:</b> an uploaded <code>.seb</code> file (the rule is the same code, but I did not use that path), a real attempt in a browser, how the role looks in Moodle's permission screens, and whether your university's rules allow manual invigilation. Try it on your own Moodle first.</p>

<p>Related: <a href="test-run-safe-exam-browser-exam.html">how to do a test run</a> and <a href="what-safe-exam-browser-can-and-cannot-protect.html">what SEB can and cannot protect</a>.</p>
''',
},
{
 'audience': 'staff',
 'slug': 'straight-into-moodle-quiz-safe-exam-browser',
 'title': 'Taking students straight into the Moodle quiz in Safe Exam Browser, with no site menus',
 'seo_title': 'Straight into the Moodle quiz in SEB, with no site menus',
 'description': 'How to launch students from an SEB link directly to a Moodle quiz and stop them leaving through the site menus: what Moodle shows before and during an attempt, and the URL filter rules that close the gaps.',
 'summary': 'Which Moodle pages show the site menu, which do not, and how to close the gaps with the URL filter.',
 'body': '''
<p>The aim: a student opens an SEB link, lands in the quiz, and has no way to wander off through the university or Moodle menus. This guide shows what Moodle really does at each step, from a test on Moodle 4.5, and how to close the gaps. Where I did not test something I say so.</p>

<h2>What the student sees, step by step</h2>
<ol>
<li><b>The launch link.</b> Moodle's <i>Launch Safe Exam Browser</i> button is a link to the quiz's settings file with the address starting <code>sebs://</code> (or <code>seb://</code> for plain http). SEB opens, reads the file and goes to the quiz. Moodle replaces the start address in your file with the quiz's own, so you cannot send students anywhere else.</li>
<li><b>Sign-in, if they are not signed in.</b> SEB is a new browser session, so they usually meet the sign-in page first, then the quiz. See <a href="microsoft-sign-in-safe-exam-browser.html">Microsoft sign-in</a> and the autologin plugin in <a href="download-staff.html">the downloads</a>.</li>
<li><b>The quiz page,</b> with the <i>Attempt quiz</i> button.</li>
<li><b>The attempt itself.</b></li>
<li><b>The summary and review pages</b> after finishing.</li>
</ol>

<h2>What I found on each page</h2>
<p>I loaded each page in a local Moodle 4.5 as a student, with requests that Moodle accepts as coming from SEB, and counted the navigation.</p>
<table>
<tr><th>Page</th><th>Layout</th><th>Site menus</th></tr>
<tr><td>Quiz page (before the attempt)</td><td>Ordinary course layout</td><td><b>Full menus shown:</b> Dashboard, My courses, the course breadcrumb, messages, notifications and the user menu (profile, grades, preferences, log out). There were 19 different Moodle links.</td></tr>
<tr><td>During the attempt</td><td>Secure layout</td><td><b>None.</b> Only the question navigation, <i>Finish attempt</i> and a way back to the quiz page.</td></tr>
<tr><td>Summary and review after the attempt</td><td>Secure layout</td><td>None. Moodle's SEB rule applies it to these pages.</td></tr>
</table>
<p>So the risk is concentrated on the <b>quiz page before the attempt starts</b> (and again if the student goes back to it).</p>

<h2>Why you cannot skip that page</h2>
<p>An attempt starts only when the student presses <i>Attempt quiz</i>, which sends a request with their session key. I know of no Moodle setting that starts the attempt for them, and a link straight to the attempt page does not work. Plan for the quiz page rather than around it.</p>

<h2>The fix: block the places the menus lead</h2>
<p>You cannot hide the menu for SEB users alone with Moodle's own settings, but you can make every menu link lead nowhere using SEB's URL filter. Allow the Moodle host, then block these areas. The builder now adds all of them when you choose to keep students inside the quiz:</p>
<table>
<tr><th>Block</th><th>Why</th></tr>
<tr><td><code>/my/*</code></td><td>Dashboard and My courses</td></tr>
<tr><td><code>/course/*</code></td><td>The course page and breadcrumb</td></tr>
<tr><td><code>/calendar/*</code>, <code>/message/*</code></td><td>Calendar, messages and notifications</td></tr>
<tr><td><code>/user/*</code></td><td>Profile, preferences, private files, site support</td></tr>
<tr><td><code>/grade/*</code></td><td>The grades overview in the user menu</td></tr>
<tr><td><code>/admin/*</code>, <code>/reportbuilder/*</code></td><td>The data retention summary in the footer and custom reports</td></tr>
<tr><td><code>/badges/*</code>, <code>/blog/*</code>, <code>/search/*</code>, <code>/tag/*</code></td><td>Other places the user menus and themes can link to</td></tr>
<tr><td><code>/login/logout.php</code></td><td>Stops the student logging out mid-exam by accident</td></tr>
<tr><td>The site home page (a regular expression)</td><td>The site name link; a simple rule cannot match the root address</td></tr>
</table>
<p>I ran the 19 menu links from the quiz page through the builder's filter. Before this change, four were still open: the grades overview, the data-privacy page, the report builder and log out. After adding the rules above they are all blocked, while the quiz, attempt and Moodle's background requests (<code>/mod/quiz/</code>, <code>/lib/ajax/</code>) stay allowed.</p>
<p><b>What the student sees:</b> the links are still on the page. Clicking one shows SEB's “blocked” message, and the student stays where they are. That is safe, but it can look like a fault, so tell students in advance.</p>

<h2>Hiding the menus completely</h2>
<p>I did not test this. A theme tweak could hide the navigation on quiz pages, but Moodle gives you no safe way to do it for SEB users only: a plain style rule would hide the menu for teachers too, and a custom plugin is more work than it is worth for most sites. The URL filter is the tested route.</p>

<h2>Same window or a pop-up?</h2>
<p>With Moodle's browser security left on <i>None</i>, <i>Attempt quiz</i> is an ordinary form: the page redirects to the attempt in the same window. I checked this on the test site and the quiz page had no links that open a new window.</p>
<p>It changes if the quiz's <b>Browser security</b> (under <i>Extra restrictions</i>) is set to <i>Full screen pop-up with some JavaScript security</i>. Then Moodle's start button opens the attempt in a <b>pop-up window</b>. It is a separate setting from the Safe Exam Browser one, and the SEB rule does not switch it off. What SEB does with that pop-up depends on its own new-window setting. My advice:</p>
<ul>
<li>Leave Moodle's browser security on <b>None</b> for SEB quizzes. SEB already provides the locked-down screen.</li>
<li>In the <code>.seb</code> file, set <i>links requesting a new window</i> to <b>open in the same window</b> (or block them). SEB's own default is to open them in a <b>new SEB window</b>. The builder now sets this to the same window by default, and you can change it in the settings step.</li>
<li>Test any link in a question, a help icon or a university header link: each should stay in one window or be blocked.</li>
</ul>
<p>I have not run the pop-up case in real SEB, so what it does there is untested.</p>

<h2>What is still open</h2>
<ul>
<li><b>Links inside question text or feedback.</b> Anything on an allowed site opens. Keep questions free of links, or use the website test to see what the quiz really requests.</li>
<li><b>Your university's own theme.</b> A custom menu, footer links or a banner may add links that my plain test did not show. Check your own site, not mine.</li>
<li><b>Embedded content.</b> Turn on the filter for embedded content if the exam must not load other sites inside a page.</li>
</ul>

<h2>How to check it on your own site</h2>
<ol>
<li>Open the quiz page in SEB as a test student and click every menu link. Each should be blocked.</li>
<li>Start the attempt and check there is no menu at all.</li>
<li>Finish, look at the review page, then use the exit route you chose.</li>
<li>Run a Moodle page through the builder's <a href="../#test">website test</a> (a HAR file works) to see which addresses the page requests and whether any would be blocked by mistake.</li>
</ol>

<h2>What was tested, and what was not</h2>
<p>A local Moodle 4.5 site with SEB set manually, requests sent with the right headers from the command line, and the builder's own filter engine for the link check. I did not use real SEB on Windows or Mac, an uploaded <code>.seb</code> file or a university theme, so confirm each with your own test run.</p>
<p>Related: <a href="block-generative-ai-safe-exam-browser.html">keeping students inside the quiz and blocking AI</a>, <a href="test-run-safe-exam-browser-exam.html">how to do a test run</a>.</p>
''',
},
]
ARTICLES = ARTICLES + STUDENT_ARTICLES
for _a in ARTICLES:
    _a.setdefault('audience', 'staff')

CSS = '''
:root { --bg:#f6f7f9; --panel:#fff; --ink:#1d2330; --muted:#5d6677; --line:#dde1e8; --accent:#2457c5; }
@media (prefers-color-scheme: dark) { :root { --bg:#14171c; --panel:#1c2027; --ink:#e6e9ef; --muted:#9aa3b2; --line:#2e343e; --accent:#6c9bff; } }
* { box-sizing: border-box; }
body { margin:0; font:17px/1.65 system-ui,-apple-system,"Segoe UI",sans-serif; background:var(--bg); color:var(--ink); }
a { color:var(--accent); }
header.site, main, footer.site { max-width:760px; margin:0 auto; padding:0 20px; }
header.site { padding-top:18px; padding-bottom:6px; display:flex; flex-wrap:wrap; gap:6px 18px; align-items:baseline; justify-content:space-between; font-size:15px; }
header.site a.brand { font-weight:600; color:var(--ink); text-decoration:none; }
header.site nav a { margin-left:14px; }
main { padding-top:12px; padding-bottom:30px; }
article, .card { background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:22px 26px; }
h1 { font-size:28px; line-height:1.25; margin:4px 0 6px; }
h2 { font-size:21px; margin:28px 0 6px; }
.meta { color:var(--muted); font-size:14px; margin:0 0 14px; }
.lead { color:var(--muted); }
code { font:14px ui-monospace,Menlo,monospace; background:rgba(127,127,127,.15); padding:1px 5px; border-radius:4px; }
table { border-collapse:collapse; width:100%; margin:10px 0; font-size:15px; }
th,td { border:1px solid var(--line); padding:6px 10px; text-align:left; vertical-align:top; }
th { background:rgba(127,127,127,.1); }
.cta { margin:26px 0 0; padding:14px 18px; border-radius:10px; background:rgba(36,87,197,.09); }
.cta a.button { display:inline-block; margin-top:6px; padding:9px 16px; border-radius:8px; background:var(--accent); color:#fff; text-decoration:none; font-weight:600; }
.callout { padding:10px 14px; border-left:4px solid var(--accent); background:rgba(36,87,197,.07); border-radius:6px; }
.notice { font-size:14px; color:var(--muted); margin-top:26px; border-top:1px solid var(--line); padding-top:12px; }
ul.list { list-style:none; padding:0; }
ul.list li { margin:0 0 14px; }
ul.list a { font-weight:600; font-size:18px; }
ul.list span { display:block; color:var(--muted); font-size:15px; }
footer.site { padding-bottom:40px; font-size:14px; color:var(--muted); }
'''

def head(title, desc, url, extra='', seo=None):
    return f'''<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{seo or title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="article">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{url}">
<meta property="og:site_name" content="{SITE_NAME}">
<meta name="twitter:card" content="summary">
<link rel="stylesheet" href="guides.css">
{extra}</head>
<body>
<header class="site"><a class="brand" href="../">{SITE_NAME}</a><nav><a href="./">Guides</a><a href="students.html">For students</a><a href="staff.html">For staff</a><a href="../">Open the builder</a></nav></header>
<main>
'''

FOOT = f'''</main>
<footer class="site"><p>{DISCLAIMER}</p><p><a href="https://github.com/seb-toolkit/config-builder">Source code on GitHub</a></p></footer>
</body>
</html>
'''

def jsonld(a):
    url = f'{BASE}guides/{a["slug"]}.html'
    stu = a['audience'] == 'students'
    data = [{
        '@context': 'https://schema.org', '@type': 'Article', 'headline': a['title'], 'description': a['description'],
        'datePublished': PUBLISHED, 'dateModified': PUBLISHED, 'inLanguage': 'en-GB', 'mainEntityOfPage': url,
        'author': {'@type': 'Organization', 'name': SITE_NAME}, 'publisher': {'@type': 'Organization', 'name': SITE_NAME}},
        {'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': SITE_NAME, 'item': BASE},
            {'@type': 'ListItem', 'position': 2, 'name': 'Guides for students' if stu else 'Guides', 'item': BASE + ('guides/students.html' if stu else 'guides/')},
            {'@type': 'ListItem', 'position': 3, 'name': a['title'], 'item': url}]}]
    return ''.join(f'<script type="application/ld+json">{json.dumps(d, ensure_ascii=False)}</script>\n' for d in data)

STUDENT_NOTICE = ('This is an independent guide, not from your university or the Safe Exam Browser project. '
                  'Settings differ between exams, so your lecturer’s or exam office’s instructions always come first.')

def article_page(a):
    url = f'{BASE}guides/{a["slug"]}.html'
    stu = a['audience'] == 'students'
    others = [b for b in ARTICLES if b is not a and b['audience'] == a['audience']]
    more = ''.join(f'<li><a href="{b["slug"]}.html">{b["title"]}</a></li>' for b in others)
    if stu:
        cta = ('<div class="cta"><b>Running the exam?</b><br>Staff can make the settings file and printable information sheets for students and invigilators with the free builder.'
               '<br><a class="button" href="../">Open the builder</a></div>\n')
        more_h = '<h2>More for students</h2>\n'
        notice = STUDENT_NOTICE + ' ' + DISCLAIMER
    else:
        cta = ('<div class="cta"><b>Set this up without the guesswork.</b><br>The builder asks plain questions and gives you a ready-to-upload <code>.seb</code> file, and printable information sheets for students and invigilators. It runs in your browser; nothing is uploaded.<br><a class="button" href="../">Open the builder</a></div>\n')
        more_h = '<h2>More guides</h2>\n'
        notice = DISCLAIMER
    return (head(a['title'], a['description'], url, jsonld(a), a['seo_title']) +
            f'<article>\n<h1>{a["title"]}</h1>\n<p class="meta">Published {PUBLISHED} · Unofficial guide{" for students" if stu else ""}</p>\n{a["body"]}\n'
            + cta + more_h + f'<ul>{more}</ul>\n<p class="notice">{notice}</p>\n</article>\n' + FOOT)

def listing(audience):
    return ''.join(f'<li><a href="{a["slug"]}.html">{a["title"]}</a><span>{a["summary"]}</span></li>' for a in ARTICLES if a['audience'] == audience)

def index_page():
    url = BASE + 'guides/'
    desc = 'Plain guides to setting up Safe Exam Browser for Moodle quizzes: making the .seb file, the URL filter, Microsoft sign-in, file downloads and uploads, and guides for students.'
    return (head('Guides to Safe Exam Browser for Moodle', desc, url, seo='Safe Exam Browser guides for Moodle | SEB Config Builder').replace('og:type" content="article"', 'og:type" content="website"') +
            f'<div class="card">\n<h1>Guides to Safe Exam Browser for Moodle</h1>\n<p class="lead">Plain-English guides for people setting up Safe Exam Browser (SEB) for online exams and quizzes. <a href="staff.html">For staff</a> · <a href="students.html">For students</a></p>\n<ul class="list">{listing("staff")}</ul>\n'
            f'<h2>For students</h2>\n<ul class="list">{listing("students")}</ul>\n<p class="notice">{DISCLAIMER}</p>\n</div>\n' + FOOT)

def students_page():
    url = BASE + 'guides/students.html'
    desc = 'Help for students sitting an exam in Safe Exam Browser: a checklist, what to do if it will not start or quit, and signing in with a Microsoft account.'
    return (head('Safe Exam Browser: help for students', desc, url, seo='Safe Exam Browser help for students | SEB Config Builder').replace('og:type" content="article"', 'og:type" content="website"') +
            f'<div class="card">\n<h1>Safe Exam Browser: help for students</h1>\n<p class="lead">Sitting an exam in Safe Exam Browser (SEB)? These short guides help you get ready, and tell you what to do if something goes wrong.</p>\n'
            f'<p class="callout"><b>Your university’s instructions come first.</b> Every exam is set up differently.</p>\n<ul class="list">{listing("students")}</ul>\n'
            f'<p class="notice">{STUDENT_NOTICE} {DISCLAIMER}</p>\n</div>\n' + FOOT)

def staff_page():
    url = BASE + 'guides/staff.html'
    desc = 'Guides, downloads and tools for staff setting up Safe Exam Browser for Moodle: making the settings file, testing an exam, what SEB can and cannot protect, and downloads.'
    return (head('Safe Exam Browser: guides and downloads for staff', desc, url, seo='Safe Exam Browser guides and downloads for staff | SEB Config Builder').replace('og:type" content="article"', 'og:type" content="website"') +
            f'<div class="card">\n<h1>Safe Exam Browser: guides and downloads for staff</h1>\n<p class="lead">For lecturers, learning technologists and exam teams setting up Safe Exam Browser (SEB) for Moodle.</p>\n'
            f'<p><a href="../">Open the SEB Config Builder</a> to make the settings file and printable sheets. Students have <a href="students.html">their own guides</a>.</p>\n<ul class="list">{listing("staff")}</ul>\n<p class="notice">{DISCLAIMER}</p>\n</div>\n' + FOOT)

def main():
    g = ROOT / 'guides'; g.mkdir(exist_ok=True)
    (g / 'guides.css').write_text(CSS.strip() + '\n')
    (g / 'index.html').write_text(index_page())
    (g / 'students.html').write_text(students_page())
    (g / 'staff.html').write_text(staff_page())
    for a in ARTICLES:
        (g / f'{a["slug"]}.html').write_text(article_page(a))
    urls = [BASE, BASE + 'guides/', BASE + 'guides/students.html', BASE + 'guides/staff.html'] + [f'{BASE}guides/{a["slug"]}.html' for a in ARTICLES]
    sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + ''.join(f'  <url><loc>{u}</loc><lastmod>{PUBLISHED}</lastmod></url>\n' for u in urls) + '</urlset>\n'
    (ROOT / 'sitemap.xml').write_text(sm)
    print('built', len(ARTICLES), 'articles')

if __name__ == '__main__':
    main()

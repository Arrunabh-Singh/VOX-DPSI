/**
 * Vox DPSI — Translation strings
 * Supported locales: 'en' (English), 'hi' (Hindi)
 *
 * Keys are dot-namespaced: section.subsection.key
 * Values may contain {placeholder} tokens replaced at render time.
 */

export const translations = {
  en: {
    // ── Common ──────────────────────────────────────────────────────────────
    'common.appName':           'Vox DPSI',
    'common.tagline':           'Student Grievance Portal',
    'common.poweredBy':         'Powered by DPS Indore Student Council',
    'common.signOut':           'Sign out',
    'common.exit':              'EXIT',
    'common.cancel':            'Cancel',
    'common.confirm':           'Confirm',
    'common.save':              'Save',
    'common.close':             'Close',
    'common.submit':            'Submit',
    'common.search':            'Search…',
    'common.loading':           'Loading…',
    'common.noData':            'No data found',
    'common.optional':          'optional',
    'common.required':          'required',
    'common.yes':               'Yes',
    'common.no':                'No',
    'common.all':               'All',
    'common.back':              'Back',
    'common.viewAll':           'View All',
    'common.characters':        'characters',

    // ── Auth ────────────────────────────────────────────────────────────────
    'auth.email':               'Email Address',
    'auth.password':            'Password',
    'auth.login':               'Sign In',
    'auth.loginTitle':          'Welcome back',
    'auth.loginSubtitle':       'Sign in to your account',
    'auth.loggingIn':           'Signing in…',
    'auth.loginError':          'Invalid email or password',

    // ── Roles ────────────────────────────────────────────────────────────────
    'role.student':             'Student',
    'role.council_member':      'Council Member',
    'role.class_teacher':       'Class Teacher',
    'role.coordinator':         'Coordinator',
    'role.principal':           'Principal',
    'role.supervisor':          'VOX-O6 Overseer',
    'role.vice_principal':      'Vice Principal',
    'role.director':            'Director',
    'role.board_member':        'Board Member',

    // ── Domains ──────────────────────────────────────────────────────────────
    'domain.academics':         'Academics',
    'domain.infrastructure':    'Infrastructure',
    'domain.safety':            'Safety',
    'domain.personal':          'Personal',
    'domain.behaviour':         'Behaviour',
    'domain.other':             'Other',

    // ── Statuses ─────────────────────────────────────────────────────────────
    'status.raised':                    'Raised',
    'status.verified':                  'Verified',
    'status.in_progress':               'In Progress',
    'status.escalated_to_teacher':      'Escalated to Teacher',
    'status.escalated_to_coordinator':  'Escalated to Coordinator',
    'status.escalated_to_principal':    'Escalated to Principal',
    'status.resolved':                  'Resolved',
    'status.appealed':                  'Appealed',
    'status.closed':                    'Closed',
    'status.merged':                    'Merged',
    'status.withdrawn':                 'Withdrawn',
    'status.archived':                  'Archived',

    // ── Navigation ───────────────────────────────────────────────────────────
    'nav.quickExit':            'Quick Exit',
    'nav.notifications':        'Notifications',

    // ── Student Dashboard ────────────────────────────────────────────────────
    'student.dashboard.title':       'My Complaints',
    'student.dashboard.welcome':     'Welcome, {name}',
    'student.dashboard.scholar':     'Scholar No: {no}',
    'student.dashboard.raiseBtn':    '+ Raise a Complaint',
    'student.dashboard.empty':       'You haven\'t raised any complaints yet.',
    'student.dashboard.emptyHint':   'Tap "Raise a Complaint" to get started.',
    'student.dashboard.statusLegend':'Status Guide',

    // ── Raise Complaint ──────────────────────────────────────────────────────
    'raise.title':              'Raise a Complaint',
    'raise.domain.label':       'Category',
    'raise.domain.placeholder': 'Select a category…',
    'raise.respondent.label':   'Who is your complaint about?',
    'raise.desc.label':         'Description',
    'raise.desc.placeholder':   'Describe your concern in detail (minimum 50 characters)…',
    'raise.desc.hint':          '{count} / 1000 characters',
    'raise.anon.label':         'Request Anonymity',
    'raise.anon.hint':          'Your name will still be visible to your assigned council member. Anonymity applies to further escalations only.',
    'raise.attach.label':       'Attachment',
    'raise.attach.hint':        'Image, PDF or document (max 10 MB) — optional',
    'raise.attach.change':      'Change',
    'raise.submit.btn':         'Submit Complaint',
    'raise.submit.loading':     'Submitting…',
    'raise.success.title':      'Complaint Submitted!',
    'raise.success.number':     'Your complaint number is',
    'raise.success.hint':       'You can track the status from your dashboard.',
    'raise.success.dashboard':  'Go to Dashboard',

    // ── Complaint Detail ─────────────────────────────────────────────────────
    'detail.title':             'Complaint Details',
    'detail.raisedOn':          'Raised on {date}',
    'detail.by':                'By',
    'detail.handler':           'Current Handler',
    'detail.timeline':          'Timeline',
    'detail.noTimeline':        'No activity yet.',
    'detail.actions':           'Actions',
    'detail.resolveNote':       'Resolution note',
    'detail.resolveNote.ph':    'Brief note on how it was resolved…',
    'detail.useTemplate':       '📋 Use Template',
    'detail.markVerified':      '✓ Mark as Verified',
    'detail.markInProgress':    '🔄 Mark as In Progress',
    'detail.markResolved':      '✅ Mark as Resolved',
    'detail.escalate':          '⬆️ Escalate',
    'detail.withdraw':          'Withdraw Complaint',
    'detail.appeal':            '📢 Appeal Decision',
    'detail.attachments':       'Attachments',
    'detail.viewFile':          'View file',
    'detail.anonymous':         'Anonymous',
    'detail.anonymousReq':      'Anonymous Requested',
    'detail.mergedInto':        'This complaint was merged into',
    'detail.closed':            'This complaint is closed.',

    // ── Council Dashboard ────────────────────────────────────────────────────
    'council.dashboard.title':  'Council Dashboard',
    'council.stats.assigned':   'Assigned',
    'council.stats.pending':    'Pending',
    'council.stats.escalated':  'Escalated',
    'council.stats.resolved':   'Resolved',

    // ── Tabs ─────────────────────────────────────────────────────────────────
    'tab.complaints':   '📋 Complaints',
    'tab.analytics':    '📊 Analytics',
    'tab.agenda':       '📅 Meeting Agenda',
    'tab.erasure':      '🗑️ Erasure Requests',
    'tab.workflows':    '⚙️ Workflows',
    'tab.auditLog':     '🔍 Audit Log',

    // ── Filters ──────────────────────────────────────────────────────────────
    'filter.all':       'All',
    'filter.new':       'New',
    'filter.inProgress':'In Progress',
    'filter.toPrincipal':'To Principal',
    'filter.resolved':  'Resolved',
    'filter.domain':    'All Domains',
    'filter.section':   'All Sections',

    // ── Notifications ────────────────────────────────────────────────────────
    'notif.empty':      'No notifications yet',
    'notif.markRead':   'Mark all read',

    // ── Errors / Empty states ────────────────────────────────────────────────
    'error.notFound':           'Complaint not found',
    'error.unauthorized':       'You are not authorised to view this',
    'error.generic':            'Something went wrong. Please try again.',
    'empty.complaints':         'No complaints match your filters',
    'empty.timeline':           'No actions recorded yet',
  },

  hi: {
    // ── Common ──────────────────────────────────────────────────────────────
    'common.appName':           'Vox DPSI',
    'common.tagline':           'छात्र शिकायत पोर्टल',
    'common.poweredBy':         'DPS इंदौर छात्र परिषद द्वारा संचालित',
    'common.signOut':           'साइन आउट',
    'common.exit':              'बाहर',
    'common.cancel':            'रद्द करें',
    'common.confirm':           'पुष्टि करें',
    'common.save':              'सहेजें',
    'common.close':             'बंद करें',
    'common.submit':            'जमा करें',
    'common.search':            'खोजें…',
    'common.loading':           'लोड हो रहा है…',
    'common.noData':            'कोई डेटा नहीं मिला',
    'common.optional':          'वैकल्पिक',
    'common.required':          'आवश्यक',
    'common.yes':               'हाँ',
    'common.no':                'नहीं',
    'common.all':               'सभी',
    'common.back':              'वापस',
    'common.viewAll':           'सभी देखें',
    'common.characters':        'अक्षर',

    // ── Auth ────────────────────────────────────────────────────────────────
    'auth.email':               'ईमेल पता',
    'auth.password':            'पासवर्ड',
    'auth.login':               'साइन इन करें',
    'auth.loginTitle':          'स्वागत है',
    'auth.loginSubtitle':       'अपने खाते में साइन इन करें',
    'auth.loggingIn':           'साइन इन हो रहा है…',
    'auth.loginError':          'ईमेल या पासवर्ड गलत है',

    // ── Roles ────────────────────────────────────────────────────────────────
    'role.student':             'छात्र',
    'role.council_member':      'परिषद सदस्य',
    'role.class_teacher':       'कक्षा शिक्षक',
    'role.coordinator':         'समन्वयक',
    'role.principal':           'प्राचार्य',
    'role.supervisor':          'VOX-O6 पर्यवेक्षक',
    'role.vice_principal':      'उप प्राचार्य',
    'role.director':            'निदेशक',
    'role.board_member':        'बोर्ड सदस्य',

    // ── Domains ──────────────────────────────────────────────────────────────
    'domain.academics':         'शैक्षणिक',
    'domain.infrastructure':    'बुनियादी ढाँचा',
    'domain.safety':            'सुरक्षा',
    'domain.personal':          'व्यक्तिगत',
    'domain.behaviour':         'आचरण',
    'domain.other':             'अन्य',

    // ── Statuses ─────────────────────────────────────────────────────────────
    'status.raised':                    'दर्ज',
    'status.verified':                  'सत्यापित',
    'status.in_progress':               'प्रगति में',
    'status.escalated_to_teacher':      'शिक्षक को भेजा',
    'status.escalated_to_coordinator':  'समन्वयक को भेजा',
    'status.escalated_to_principal':    'प्राचार्य को भेजा',
    'status.resolved':                  'हल हुई',
    'status.appealed':                  'अपील की गई',
    'status.closed':                    'बंद',
    'status.merged':                    'मिली हुई',
    'status.withdrawn':                 'वापस ली गई',
    'status.archived':                  'संग्रहीत',

    // ── Navigation ───────────────────────────────────────────────────────────
    'nav.quickExit':            'जल्दी बाहर',
    'nav.notifications':        'सूचनाएँ',

    // ── Student Dashboard ────────────────────────────────────────────────────
    'student.dashboard.title':       'मेरी शिकायतें',
    'student.dashboard.welcome':     'नमस्ते, {name}',
    'student.dashboard.scholar':     'छात्र क्रमांक: {no}',
    'student.dashboard.raiseBtn':    '+ शिकायत दर्ज करें',
    'student.dashboard.empty':       'आपने अभी तक कोई शिकायत दर्ज नहीं की है।',
    'student.dashboard.emptyHint':   '"शिकायत दर्ज करें" दबाएँ।',
    'student.dashboard.statusLegend':'स्थिति मार्गदर्शिका',

    // ── Raise Complaint ──────────────────────────────────────────────────────
    'raise.title':              'शिकायत दर्ज करें',
    'raise.domain.label':       'श्रेणी',
    'raise.domain.placeholder': 'श्रेणी चुनें…',
    'raise.respondent.label':   'शिकायत किसके बारे में है?',
    'raise.desc.label':         'विवरण',
    'raise.desc.placeholder':   'अपनी समस्या विस्तार से लिखें (न्यूनतम 50 अक्षर)…',
    'raise.desc.hint':          '{count} / 1000 अक्षर',
    'raise.anon.label':         'गुमनाम रहने का अनुरोध',
    'raise.anon.hint':          'आपका नाम आपके परिषद सदस्य को दिखेगा। आगे भेजने पर ही गुमनामी लागू होती है।',
    'raise.attach.label':       'संलग्नक',
    'raise.attach.hint':        'चित्र, PDF या दस्तावेज़ (अधिकतम 10 MB) — वैकल्पिक',
    'raise.attach.change':      'बदलें',
    'raise.submit.btn':         'शिकायत जमा करें',
    'raise.submit.loading':     'जमा हो रही है…',
    'raise.success.title':      'शिकायत सफलतापूर्वक दर्ज!',
    'raise.success.number':     'आपकी शिकायत संख्या है',
    'raise.success.hint':       'आप डैशबोर्ड से स्थिति देख सकते हैं।',
    'raise.success.dashboard':  'डैशबोर्ड पर जाएँ',

    // ── Complaint Detail ─────────────────────────────────────────────────────
    'detail.title':             'शिकायत विवरण',
    'detail.raisedOn':          '{date} को दर्ज',
    'detail.by':                'द्वारा',
    'detail.handler':           'वर्तमान प्रभारी',
    'detail.timeline':          'गतिविधि',
    'detail.noTimeline':        'अभी तक कोई गतिविधि नहीं।',
    'detail.actions':           'कार्रवाई',
    'detail.resolveNote':       'समाधान टिप्पणी',
    'detail.resolveNote.ph':    'शिकायत कैसे हल हुई, संक्षेप में लिखें…',
    'detail.useTemplate':       '📋 टेम्पलेट का उपयोग करें',
    'detail.markVerified':      '✓ सत्यापित करें',
    'detail.markInProgress':    '🔄 प्रगति में चिह्नित करें',
    'detail.markResolved':      '✅ हल चिह्नित करें',
    'detail.escalate':          '⬆️ आगे भेजें',
    'detail.withdraw':          'शिकायत वापस लें',
    'detail.appeal':            '📢 अपील करें',
    'detail.attachments':       'संलग्नक',
    'detail.viewFile':          'फ़ाइल देखें',
    'detail.anonymous':         'गुमनाम',
    'detail.anonymousReq':      'गुमनामी अनुरोधित',
    'detail.mergedInto':        'यह शिकायत इसमें मिला दी गई है',
    'detail.closed':            'यह शिकायत बंद है।',

    // ── Council Dashboard ────────────────────────────────────────────────────
    'council.dashboard.title':  'परिषद डैशबोर्ड',
    'council.stats.assigned':   'सौंपी गई',
    'council.stats.pending':    'लंबित',
    'council.stats.escalated':  'भेजी गई',
    'council.stats.resolved':   'हल हुई',

    // ── Tabs ─────────────────────────────────────────────────────────────────
    'tab.complaints':   '📋 शिकायतें',
    'tab.analytics':    '📊 विश्लेषण',
    'tab.agenda':       '📅 बैठक एजेंडा',
    'tab.erasure':      '🗑️ मिटाने के अनुरोध',
    'tab.workflows':    '⚙️ वर्कफ़्लो',
    'tab.auditLog':     '🔍 लेखापरीक्षा लॉग',

    // ── Filters ──────────────────────────────────────────────────────────────
    'filter.all':       'सभी',
    'filter.new':       'नई',
    'filter.inProgress':'प्रगति में',
    'filter.toPrincipal':'प्राचार्य को',
    'filter.resolved':  'हल हुई',
    'filter.domain':    'सभी श्रेणियाँ',
    'filter.section':   'सभी कक्षाएँ',

    // ── Notifications ────────────────────────────────────────────────────────
    'notif.empty':      'कोई सूचना नहीं',
    'notif.markRead':   'सभी पढ़ा हुआ चिह्नित करें',

    // ── Errors / Empty states ────────────────────────────────────────────────
    'error.notFound':           'शिकायत नहीं मिली',
    'error.unauthorized':       'आप इसे देखने के लिए अधिकृत नहीं हैं',
    'error.generic':            'कुछ गलत हो गया। कृपया दोबारा प्रयास करें।',
    'empty.complaints':         'कोई शिकायत आपके फ़िल्टर से मेल नहीं खाती',
    'empty.timeline':           'अभी तक कोई गतिविधि दर्ज नहीं',
  },
}

export default translations

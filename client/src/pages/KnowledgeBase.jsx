import { useEffect, useMemo, useState } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

const FAQ_SECTIONS = [
  {
    title: 'Raising a Complaint',
    items: [
      {
        question: 'What kind of issues can I raise on Vox DPSI?',
        answer: 'You can raise concerns about bullying, peer conflict, classroom issues, infrastructure, safety, school processes, staff conduct, or any situation where you need the council or school leadership to step in. If something is affecting your ability to feel safe, respected, or heard at school, it belongs here.',
      },
      {
        question: 'How detailed should my complaint be?',
        answer: 'Try to include what happened, where it happened, when it happened, who was involved, and what outcome would help. You do not need perfect wording. A clear timeline and specific details help the council understand what action is possible.',
      },
      {
        question: 'Can I attach proof or screenshots?',
        answer: 'Yes. If you have a relevant image, document, screenshot, or other file, you can attach it while raising the complaint. Only upload material that directly supports the issue and avoid sharing private information about others unless it is necessary.',
      },
      {
        question: 'What if I choose the wrong category?',
        answer: 'Choose the closest category and explain the details in your description. If the complaint needs to be handled by a different person or team, it can still be routed appropriately after review.',
      },
      {
        question: 'Can I edit a complaint after submitting it?',
        answer: 'Once submitted, the complaint becomes part of the official handling record. If you forgot an important detail, open the complaint and add a follow-up comment or speak to the assigned handler so the new information is included.',
      },
    ],
  },
  {
    title: 'Anonymity & Privacy',
    items: [
      {
        question: 'What does requesting anonymity mean?',
        answer: 'Requesting anonymity means you are asking for your identity to be protected during later handling or escalation. Your assigned handler may still need to know who submitted the complaint so they can verify details and support you responsibly.',
      },
      {
        question: 'Who can see my complaint?',
        answer: 'Access depends on the type of complaint and who needs to act on it. Student council handlers see complaints assigned to them, while staff-related, council-member, or serious safety complaints may be routed directly to coordinators or senior school leadership.',
      },
      {
        question: 'Will the person I complain about see my name?',
        answer: 'Vox DPSI is designed to limit unnecessary disclosure. Your name should not be shared casually with the person named in the complaint. In some situations, the school may need to discuss facts carefully to resolve the issue, while still protecting you as much as possible.',
      },
      {
        question: 'Is my data kept forever?',
        answer: 'Complaint records are kept only as long as needed for school accountability, safety, and legal obligations. You can use the data rights options in the dashboard to request access, correction, or erasure where applicable.',
      },
    ],
  },
  {
    title: 'What Happens Next',
    items: [
      {
        question: 'What happens after I submit a complaint?',
        answer: 'Your complaint is registered with a complaint number and routed to the appropriate handler. The handler reviews the details, may ask follow-up questions, and records actions taken so the issue can move toward resolution.',
      },
      {
        question: 'How long will it take to get a response?',
        answer: 'Most general complaints are expected to receive attention within the standard school handling window shown in Vox DPSI. Urgent or safety-related issues are prioritized faster, especially when they involve immediate risk or staff escalation.',
      },
      {
        question: 'What do the complaint statuses mean?',
        answer: 'Statuses show where your complaint is in the process. For example, open means it has been received, in progress means someone is working on it, resolved means an action or decision has been recorded, and escalated means a higher authority is handling it.',
      },
      {
        question: 'What if I am not satisfied with the resolution?',
        answer: 'If the issue is not resolved or the response does not address your concern, you can add a follow-up or use the available appeal/escalation options. Be specific about what still feels unresolved and what additional action you believe is needed.',
      },
    ],
  },
]

export default function KnowledgeBase() {
  const [search, setSearch] = useState('')
  const [openItems, setOpenItems] = useState(() => new Set())

  useEffect(() => { document.title = 'Knowledge Base - Vox DPSI' }, [])

  const filteredSections = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return FAQ_SECTIONS

    return FAQ_SECTIONS
      .map(section => ({
        ...section,
        items: section.items.filter(item =>
          `${item.question} ${item.answer}`.toLowerCase().includes(query)
        ),
      }))
      .filter(section => section.items.length > 0)
  }, [search])

  const totalMatches = filteredSections.reduce((sum, section) => sum + section.items.length, 0)

  const toggleItem = (id) => {
    setOpenItems(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="min-h-screen" style={{ background: '#eae1c4', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <section
          className="rounded-2xl p-6 mb-6"
          style={{
            background: '#003366',
            border: '1px solid rgba(255,215,0,0.25)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.22)',
          }}
        >
          <p className="text-sm font-bold uppercase tracking-wide" style={{ color: '#FFD700' }}>
            Student Help
          </p>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">
            Knowledge Base
          </h1>
          <p className="text-sm mt-2 max-w-2xl" style={{ color: 'rgba(255,255,255,0.74)' }}>
            Quick answers about raising complaints, privacy, and what happens after you submit.
          </p>
        </section>

        <div className="glass rounded-2xl p-4 mb-6">
          <label htmlFor="faq-search" className="block text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#003366' }}>
            Search FAQs
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg" aria-hidden="true">?</span>
            <input
              id="faq-search"
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by question or answer..."
              className="w-full rounded-xl py-3 pl-11 pr-4 text-sm font-medium focus:outline-none"
              style={{
                background: '#fff',
                border: '1.5px solid rgba(0,51,102,0.18)',
                color: '#111827',
              }}
            />
          </div>
          {search.trim() && (
            <p className="text-xs mt-2" style={{ color: '#6B7280' }}>
              {totalMatches} result{totalMatches === 1 ? '' : 's'} found
            </p>
          )}
        </div>

        {filteredSections.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center">
            <p className="text-4xl mb-3">?</p>
            <h2 className="font-black text-lg" style={{ color: '#003366' }}>No matching FAQs</h2>
            <p className="text-sm text-gray-500 mt-1">Try searching for complaint, privacy, status, appeal, or attachment.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredSections.map(section => (
              <section key={section.title} className="glass rounded-2xl p-5">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <h2 className="text-lg font-black" style={{ color: '#003366' }}>{section.title}</h2>
                  <span
                    className="text-xs font-black rounded-full px-3 py-1"
                    style={{ background: 'rgba(255,215,0,0.18)', color: '#003366', border: '1px solid rgba(255,215,0,0.45)' }}
                  >
                    {section.items.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {section.items.map((item) => {
                    const id = `${section.title}-${item.question}`
                    const isOpen = openItems.has(id)

                    return (
                      <div
                        key={id}
                        className="rounded-xl overflow-hidden"
                        style={{ border: '1px solid rgba(0,51,102,0.12)', background: '#fff' }}
                      >
                        <button
                          type="button"
                          onClick={() => toggleItem(id)}
                          className="w-full px-4 py-4 flex items-center justify-between gap-4 text-left transition-all"
                          style={{ color: '#003366' }}
                          aria-expanded={isOpen}
                        >
                          <span className="font-bold text-sm sm:text-base">{item.question}</span>
                          <span
                            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-black"
                            style={{ background: isOpen ? '#003366' : 'rgba(255,215,0,0.24)', color: isOpen ? '#FFD700' : '#003366' }}
                          >
                            {isOpen ? '-' : '+'}
                          </span>
                        </button>

                        {isOpen && (
                          <div
                            className="px-4 pb-4 text-sm leading-relaxed animate-slide-down"
                            style={{ color: '#4B5563' }}
                          >
                            {item.answer}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}

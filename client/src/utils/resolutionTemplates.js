/**
 * Resolution Templates — suggested resolution notes for council members
 * Keyed by complaint domain. Each domain has 3 realistic, warm, institutional-sounding templates.
 */

export const RESOLUTION_TEMPLATES = {
  academics: [
    `The issue regarding your academic concern has been reviewed. We have discussed the matter with the relevant teacher and ensured that the necessary support will be provided moving forward. Please reach out if you need any additional assistance.`,

    `After careful consideration, we have arranged for supplementary help sessions to address the academic gap you reported. Your teacher has been informed and will monitor your progress. We encourage you to actively participate in these sessions.`,

    `We have mediated a resolution with your instructor to ensure clarity on the syllabus and assessment criteria. A follow-up will be conducted in two weeks to confirm improvement. Your academic growth remains our priority.`,
  ],

  infrastructure: [
    `The infrastructure concern you raised has been forwarded to the maintenance team. The required repairs will be completed within the next 2–3 working days. We apologise for the inconvenience caused.`,

    `We have inspected the reported issue and coordinated with the estate department. corrective measures are now underway, and we expect full resolution shortly. Thank you for your patience.`,

    `Your complaint about the facility has been logged with the highest priority. The concerned team has been instructed to address it as an urgent matter. We will update you once the work is complete.`,
  ],

  safety: [
    `Your safety concern has been addressed by conducting a thorough check in the reported area. Additional supervision has been arranged to prevent recurrence. Your well-being is our top priority.`,

    `We have implemented the necessary safety measures following your report. This includes installing clearer signage and briefin the security staff. Please remain vigilant and report any further issues immediately.`,

    `After investigating your safety complaint, we have taken appropriate action with the concerned staff. A reminder of our safety protocols has been issued to all personnel. We take such matters very seriously.`,
  ],

  personal: [
    `We understand the personal difficulty you are facing and have connected you with the school counsellor. A supportive plan is in place, and we are here to help you through this time.`,

    `Your privacy and well-being are important to us. We have arranged a confidential meeting with the student welfare committee to discuss your concerns further. Please do not hesitate to share any additional details.`,

    `Following your complaint, we have initiated a gentle, private dialogue with all involved parties. The aim is to restore a comfortable environment for everyone. You will be kept informed of every step.`,
  ],

  behaviour: [
    `The behavioural concern you raised has been discussed with the involved individuals. Counselling has been offered, and we expect improved interactions moving forward.`,

    `We have mediated the situation and issued a formal warning where necessary. A follow-up will be conducted to ensure the behaviour does not continue. Your cooperation in maintaining a respectful community is appreciated.`,

    `After a thorough inquiry, appropriate disciplinary action has been taken. We have also organised a brief workshop on empathy and respect for the relevant group. Such conduct will not be tolerated.`,
  ],

  other: [
    `Your suggestion has been noted and will be considered in the next student welfare committee meeting. We value your input and are always looking to improve.`,

    `We have forwarded your request to the appropriate department for necessary action. You should receive a response within 3–4 working days. Thank you for bringing this to our attention.`,

    `This matter has been resolved as per the school's standard procedure. If you have any further questions, please feel free to contact the council office directly.`,
  ],
}

/**
 * Get templates for a given domain.
 * @param {string} domain
 * @returns {string[]} Array of 3 template strings, or empty array if domain not recognised.
 */
export function getTemplatesForDomain(domain) {
  if (!domain) return []
  return RESOLUTION_TEMPLATES[domain] || []
}

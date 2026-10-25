import type { Dictionary } from "./en";

/**
 * Spanish (US Spanish, neutral register).
 *
 * The attorney speaks English, Armenian and Russian — not Spanish — so this
 * copy never says the consultation happens in Spanish or that the lawyer
 * "speaks your language". Visitors are invited to say they prefer Spanish
 * on the form; how the firm then serves them (bilingual staff, an
 * interpreter, a referral) is the owner's decision.
 *
 * TODO(human): attorney review required before NEXT_PUBLIC_LOCALE_PAGES_LIVE
 * is set, and decide how Spanish-speaking callers are served (spec §18
 * "Spanish intake support?"). Legal-services advertising copy must stay
 * CRPC §7.1 compliant in Spanish (firm name + Glendale address,
 * "Publicidad de abogados", no guarantee language, no implied Spanish-
 * speaking attorney). The fee sentence mirrors the owner-approved English
 * claim "No recovery, no attorney fees or case expenses."
 */
export const es: Dictionary = {
  meta: {
    languageName: "Español",
    homeTitle: "Abogado de accidentes en Glendale — Consulta gratuita",
    homeDescription:
      "Mihran M. Ghazaryan representa a personas lesionadas en accidentes de auto, camión y motocicleta en toda California. Consulta gratuita. Si no hay compensación, no hay honorarios de abogado ni gastos del caso.",
    contactTitle: "Consulta gratuita — Contacte a MMG Law Firm",
    contactDescription:
      "Cuéntenos qué pasó. Le devolvemos la llamada en horario de oficina. Consulta gratuita con el abogado de accidentes Mihran M. Ghazaryan en Glendale.",
  },
  nav: {
    home: "Inicio",
    practiceAreas: "Áreas de práctica",
    locations: "Ciudades",
    about: "Nosotros",
    blog: "Blog",
    reviews: "Opiniones",
    caseResults: "Resultados",
    contact: "Contacto",
    englishSite: "English",
    menu: "Menú",
  },
  cta: {
    freeConsultation: "Consulta gratuita",
    requestConsultation: "Solicitar una consulta gratuita",
    callNow: "Llamar ahora",
    call: "Llamar al {phone}",
    noFeeUnlessWeWin:
      "Si no hay compensación, no hay honorarios de abogado ni gastos del caso.",
  },
  common: {
    menu: "Menú",
    close: "Cerrar",
    language: "Idioma",
    skipToContent: "Ir al contenido principal",
    inEnglish: "en inglés",
    quickContact: "Contacto rápido",
  },
  landing: {
    eyebrow: "Glendale, California · Lesiones personales",
    h1: "¿Se lesionó en un accidente? Hable con un abogado de lesiones personales en California.",
    lead:
      "Mihran M. Ghazaryan representa a personas lesionadas en accidentes de auto, camión y motocicleta en toda California. La consulta es gratuita.",
    feeNote: "No paga nada por adelantado.",
    practicesTitle: "Casos que atendemos",
    practices: {
      car: {
        title: "Accidentes de auto",
        body: "Determinación de la culpa, disputas con la aseguradora y compensación por sus lesiones.",
      },
      truck: {
        title: "Accidentes de camión",
        body: "Choques con vehículos comerciales, responsabilidad de la empresa de transporte y pruebas.",
      },
      moto: {
        title: "Accidentes de motocicleta",
        body: "Reclamos de motociclistas, culpa compartida y compensación por lesiones.",
      },
      other: {
        title: "Otros casos de lesiones",
        body: "Atropellos de peatones y ciclistas, resbalones y caídas, mordeduras de perro, muerte por negligencia.",
      },
    },
    whyTitle: "Cómo trabajamos",
    why: {
      direct: {
        title: "Acceso directo al abogado",
        body: "Su caso lo lleva el abogado, no un centro de llamadas. Usted habla directamente con él.",
      },
      language: {
        title: "Idiomas",
        body: "El abogado habla inglés, armenio y ruso. Si prefiere comunicarse en español, indíquelo en el formulario y le explicaremos cómo podemos atenderle.",
      },
      insurer: {
        title: "Nosotros tratamos con la aseguradora",
        body: "Nos encargamos de las llamadas, los documentos y la negociación para que usted pueda concentrarse en recuperarse.",
      },
    },
    attorneyTitle: "Sobre el abogado",
    attorneyBody:
      "Mihran M. Ghazaryan, Colegio de Abogados de California n.º {bar}. La oficina está en Glendale y atiende a clientes en toda California.",
    attorneyLink: "Perfil del abogado",
    areasTitle: "Dónde atendemos",
    areasBody: "Glendale, el condado de Los Ángeles y clientes en toda California.",
    contactTitle: "Consulta gratuita",
    contactBody:
      "Cuéntenos qué pasó. Le devolvemos la llamada en horario de oficina. Si prefiere español, menciónelo en su mensaje.",
    noticeTitle: "Tenga en cuenta:",
    noticeBody:
      "Esta página es una traducción ofrecida por conveniencia. Las páginas en inglés, incluidos los avisos legales a continuación, son la versión oficial.",
  },
  contact: {
    title: "Contáctenos para una consulta gratuita",
    lead: "Cuéntenos qué pasó. Le devolvemos la llamada en horario de oficina. Si prefiere español, menciónelo en su mensaje.",
    officeTitle: "Oficina",
    hoursLabel: "Horario",
    hours: "De lunes a viernes, de 9:00 a 18:00 (hora del Pacífico)",
    phoneLabel: "Teléfono",
    emailLabel: "Correo electrónico",
    whatToExpectTitle: "Qué sigue",
    whatToExpect: {
      call: "El abogado o su personal le devolverá la llamada, normalmente el mismo día hábil.",
      free: "La consulta es gratuita y no le compromete a nada.",
      privacy: "Lo que nos cuente es confidencial. No envíe expedientes médicos por este formulario.",
    },
  },
  leadForm: {
    headline: "Solicitar una consulta gratuita",
    fullName: "Nombre completo *",
    phone: "Teléfono *",
    email: "Correo electrónico (opcional)",
    accidentType: "Tipo de accidente (opcional)",
    accidentTypes: {
      car: "Accidente de auto",
      truck: "Accidente de camión",
      motorcycle: "Accidente de motocicleta",
      other: "Otro",
    },
    whatHappened: "¿Qué pasó? Basta con una breve descripción.",
    submit: "Solicitar mi consulta gratuita",
    sending: "Enviando…",
    successTitle: "Gracias, {name}.",
    successBody:
      "Recibimos su solicitud. Le devolvemos la llamada en horario de oficina. Si necesita ayuda inmediata, llame al",
    honeypot: "Empresa (dejar en blanco)",
    fieldErrors: {
      full_name: "Escriba su nombre completo.",
      phone: "Escriba un número de teléfono válido de EE. UU.",
      email: "Escriba un correo electrónico válido.",
      description: "Use menos de 500 caracteres y no incluya enlaces.",
      consent_contact: "Necesitamos su consentimiento para poder contactarle.",
      turnstileToken: "Complete el paso de verificación.",
    },
    errors: {
      rateLimited: "Ha enviado varias solicitudes recientemente. Llame al {phone}.",
      checkFields: "Revise los campos marcados.",
      turnstile: "No se pudo cargar la protección contra bots. Llame al {phone}.",
      generic: "No pudimos enviar su solicitud. Inténtelo de nuevo o llame al {phone}.",
      timeout: "Esto está tardando más de lo normal. Llame al {phone}.",
      network: "Error de conexión. Inténtelo de nuevo o llame al {phone}.",
    },
    consent:
      "Al marcar esta casilla, acepto recibir llamadas y mensajes de texto de MMG Law Firm al número indicado, incluso mediante marcación automática. El consentimiento no es una condición para recibir el servicio. Pueden aplicarse tarifas de mensajes y datos. Responda STOP para cancelar.",
  },
  footer: {
    attorneyAdvertising: "Publicidad de abogados.",
    noticesIntro:
      "Los avisos legales a continuación se presentan en inglés, conforme a las Reglas de Conducta Profesional de California.",
    languagesLabel: "Idiomas",
    hoursLabel: "Horario",
    cta: "Consulta gratuita",
    linksTitle: "Páginas",
    legalTitle: "Legal",
    privacy: "Política de privacidad",
    disclosures: "Divulgaciones",
    accessibility: "Accesibilidad",
    rights: "Todos los derechos reservados.",
  },
};

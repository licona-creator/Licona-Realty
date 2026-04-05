/**
 * DISC-Adapted Message Generator
 *
 * All messages are hardcoded. Zero API calls.
 * Mexican Spanish with proper unicode.
 * One exclamation mark max per message.
 * No emojis in messages.
 */

import type { PostCloseMilestoneType } from './milestone-engine';

interface MessageContact {
  first_name: string;
  language_preference: string;
  disc_type: 'D' | 'I' | 'S' | 'C' | null;
}

interface GeneratedMessage {
  message: string;
  recommended_channel: 'text';
}

interface PostCloseGeneratedMessage extends GeneratedMessage {
  milestone_label: string;
}

function isSpanish(contact: MessageContact): boolean {
  return contact.language_preference === 'es';
}

function disc(contact: MessageContact): string {
  return contact.disc_type || '';
}

// --- BIRTHDAY MESSAGES ---

const BIRTHDAY_EN: Record<string, string> = {
  D: 'Happy birthday [first_name]. Hope you have a great one.',
  I: 'Happy birthday [first_name]! Hope you are celebrating big today.',
  S: 'Happy birthday [first_name]. Wishing you and the family a wonderful day.',
  C: 'Happy birthday [first_name]. Hope this year brings everything you have planned for.',
  '': 'Happy birthday [first_name]. Hope it is a great day.',
};

const BIRTHDAY_ES: Record<string, string> = {
  D: 'Feliz cumplea\u00f1os [first_name]. Que la pases muy bien.',
  I: 'Feliz cumplea\u00f1os [first_name]! Que sea un d\u00eda incre\u00edble.',
  S: 'Feliz cumplea\u00f1os [first_name]. Muchas felicidades para ti y tu familia.',
  C: 'Feliz cumplea\u00f1os [first_name]. Que este a\u00f1o te traiga todo lo que has planeado.',
  '': 'Feliz cumplea\u00f1os [first_name]. Que la pases muy bien hoy.',
};

const MILESTONE_AGES = [30, 40, 50, 60];

export function generateBirthdayMessage(
  contact: MessageContact,
  turningAge: number | null
): GeneratedMessage {
  const es = isSpanish(contact);
  const d = disc(contact);
  const messages = es ? BIRTHDAY_ES : BIRTHDAY_EN;
  let message = (messages[d] || messages['']).replace('[first_name]', contact.first_name);

  if (turningAge && MILESTONE_AGES.includes(turningAge)) {
    const suffix = es ? ` Los grandes ${turningAge}!` : ` The big ${turningAge}!`;
    message += suffix;
  }

  return { message, recommended_channel: 'text' };
}

// --- HOLIDAY MESSAGES ---

interface HolidayMessages {
  en: Record<string, string>;
  es: string;
}

const HOLIDAY_MESSAGES: Record<string, HolidayMessages> = {
  'Thanksgiving': {
    en: {
      D: 'Happy Thanksgiving [first_name]. Enjoy it.',
      I: 'Happy Thanksgiving [first_name]! Hope you have an amazing time with family.',
      S: 'Happy Thanksgiving [first_name]. Hope you and the family have a peaceful day.',
      C: 'Happy Thanksgiving [first_name]. Hope you enjoy the holiday.',
      '': 'Happy Thanksgiving [first_name]. Hope you have a great day with family.',
    },
    es: 'Feliz D\u00eda de Acci\u00f3n de Gracias [first_name]. Que la pases muy bien con la familia.',
  },
  'Christmas': {
    en: {
      D: 'Merry Christmas [first_name]. Hope you enjoy it.',
      I: 'Merry Christmas [first_name]! Hope the holidays are amazing.',
      S: 'Merry Christmas [first_name]. Wishing you and your family a peaceful holiday.',
      C: 'Merry Christmas [first_name]. Hope you have a great holiday season.',
      '': 'Merry Christmas [first_name]. Wishing you a great holiday.',
    },
    es: 'Feliz Navidad [first_name]. Que pases una Navidad llena de paz y alegr\u00eda con tu familia.',
  },
  "New Year's Day": {
    en: {
      D: 'Happy New Year [first_name]. Here is to a great year.',
      I: 'Happy New Year [first_name]! Let us make this year the best one yet.',
      S: 'Happy New Year [first_name]. Wishing you and your family a wonderful year ahead.',
      C: 'Happy New Year [first_name]. Hope this year brings everything you are working toward.',
      '': 'Happy New Year [first_name]. Wishing you a great year ahead.',
    },
    es: 'Feliz A\u00f1o Nuevo [first_name]. Que este a\u00f1o te traiga muchas bendiciones.',
  },
  "Mother's Day": {
    en: {
      D: "Happy Mother's Day [first_name]. Hope all the moms in your life have a great day.",
      I: "Happy Mother's Day [first_name]! Hope all the moms in your life are being celebrated today.",
      S: "Happy Mother's Day [first_name]. Hope the special moms in your life have a beautiful day.",
      C: "Happy Mother's Day [first_name]. Hope you have a great Sunday.",
      '': "Happy Mother's Day [first_name]. Hope it is a great day.",
    },
    es: 'Feliz D\u00eda de las Madres [first_name]. Que todas las mam\u00e1s en tu vida tengan un d\u00eda hermoso.',
  },
  "Father's Day": {
    en: {
      D: "Happy Father's Day [first_name]. Hope all the dads in your life have a good one.",
      I: "Happy Father's Day [first_name]! Hope all the dads in your life are being celebrated today.",
      S: "Happy Father's Day [first_name]. Hope the dads in your life have a great day.",
      C: "Happy Father's Day [first_name]. Hope you enjoy the day.",
      '': "Happy Father's Day [first_name]. Hope it is a great day.",
    },
    es: 'Feliz D\u00eda del Padre [first_name]. Que todos los pap\u00e1s en tu vida tengan un gran d\u00eda.',
  },
};

export function generateHolidayMessage(
  contact: MessageContact,
  holidayName: string
): GeneratedMessage {
  const holidayData = HOLIDAY_MESSAGES[holidayName];
  if (!holidayData) {
    return {
      message: `Happy ${holidayName} ${contact.first_name}.`,
      recommended_channel: 'text',
    };
  }

  const es = isSpanish(contact);
  let message: string;

  if (es) {
    message = holidayData.es;
  } else {
    const d = disc(contact);
    message = holidayData.en[d] || holidayData.en[''];
  }

  message = message.replace('[first_name]', contact.first_name);
  return { message, recommended_channel: 'text' };
}

// --- POST-CLOSE MESSAGES ---

interface PostCloseMessages {
  en: Record<string, string>;
  es: Record<string, string>;
}

const POST_CLOSE_MESSAGES: Record<string, PostCloseMessages> = {
  '30day': {
    en: {
      D: 'Hey [first_name], how is the new place? Let me know if you need anything.',
      I: 'Hey [first_name]! How are you liking the new house? I hope you are settling in great.',
      S: 'Hey [first_name], just checking in. Hope you and the family are settling into [property] nicely. Let me know if anything comes up.',
      C: 'Hey [first_name], just wanted to check in on [property]. If anything needs attention or you have questions about the home, reach out anytime.',
      '': 'Hey [first_name], hope you are settling into [property] well. Let me know if you need anything.',
    },
    es: {
      D: 'Oye [first_name], c\u00f3mo va todo con la casa nueva? Av\u00edsame si necesitas algo.',
      I: 'Oye [first_name]! C\u00f3mo te est\u00e1 gustando la casa nueva? Espero que todo est\u00e9 incre\u00edble.',
      S: 'Oye [first_name], solo quiero ver c\u00f3mo van. Espero que t\u00fa y la familia se est\u00e9n acomodando bien en [property].',
      C: 'Oye [first_name], quiero ver c\u00f3mo va todo con [property]. Si algo necesita atenci\u00f3n o tienes preguntas, av\u00edsame.',
      '': 'Oye [first_name], espero que te est\u00e9s acomodando bien en [property]. Av\u00edsame si necesitas algo.',
    },
  },
  '90day': {
    en: {
      D: 'Hey [first_name], how is [property] treating you? If anyone you know is looking to buy or sell, send them my way.',
      I: 'Hey [first_name]! 3 months in the new place. Hope you are loving it. By the way, your neighborhood has been pretty active lately.',
      S: 'Hey [first_name], hope everything is going well at [property]. Your neighborhood has had some activity. Let me know if you ever have questions.',
      C: 'Hey [first_name], 3 months at [property]. I pulled some recent sales data for your neighborhood if you are curious how values are trending.',
      '': 'Hey [first_name], hope you are doing well at [property]. Let me know if you ever need anything.',
    },
    es: {
      D: 'Oye [first_name], c\u00f3mo te est\u00e1 tratando [property]? Si alguien que conoces quiere comprar o vender, m\u00e1ndalos conmigo.',
      I: 'Oye [first_name]! 3 meses en la casa nueva. Espero que te encante. Por cierto, tu vecindario ha estado bien activo \u00faltimamente.',
      S: 'Oye [first_name], espero que todo vaya bien en [property]. Tu vecindario ha tenido bastante movimiento. Av\u00edsame si tienes preguntas.',
      C: 'Oye [first_name], 3 meses en [property]. Tengo datos de ventas recientes en tu vecindario si te interesa ver c\u00f3mo van los valores.',
      '': 'Oye [first_name], espero que todo vaya bien en [property]. Av\u00edsame si necesitas algo.',
    },
  },
  '180day': {
    en: {
      D: 'Hey [first_name], 6 months at [property]. If anyone in your circle is thinking about buying or selling, I would love to help them out.',
      I: 'Hey [first_name]! Can you believe it has been 6 months already? Hope you are still loving [property]. If you know anyone looking for a home, send them my way.',
      S: 'Hey [first_name], hope you and the family are doing well at [property]. If anyone you know is thinking about making a move, I am always happy to help.',
      C: 'Hey [first_name], 6 months at [property]. Your neighborhood has seen some interesting activity. Happy to share the data. And if anyone you know needs a real estate resource, feel free to pass along my info.',
      '': 'Hey [first_name], hope you are still loving [property]. If anyone you know is looking to buy or sell, I would love to help.',
    },
    es: {
      D: 'Oye [first_name], 6 meses en [property]. Si alguien en tu c\u00edrculo est\u00e1 pensando en comprar o vender, me encantar\u00eda ayudarlos.',
      I: 'Oye [first_name]! Ya van 6 meses. Espero que sigas disfrutando [property]. Si conoces a alguien buscando casa, m\u00e1ndalos conmigo.',
      S: 'Oye [first_name], espero que t\u00fa y la familia est\u00e9n muy bien en [property]. Si alguien que conoces quiere hacer un cambio, siempre estoy para ayudar.',
      C: 'Oye [first_name], 6 meses en [property]. Tu vecindario ha tenido actividad interesante. Si alguien necesita un recurso de bienes ra\u00edces, pasa mi info.',
      '': 'Oye [first_name], espero que sigas disfrutando [property]. Si alguien que conoces quiere comprar o vender, me encantar\u00eda ayudar.',
    },
  },
  '1year': {
    en: {
      D: 'Hey [first_name], 1 year at [property]. Time flies. If you are curious what your home is worth now, I can run the numbers.',
      I: 'Hey [first_name]! 1 year in your home. That went fast. Hope you are still loving it. Want me to pull up what your place might be worth now?',
      S: 'Hey [first_name], happy 1 year at [property]. Hope it still feels like home. I can put together a value update for your area if you are interested.',
      C: 'Hey [first_name], it has been 1 year since closing on [property]. I can run a market analysis to show you how your investment has performed. Let me know if you want the data.',
      '': 'Hey [first_name], 1 year at [property]. Hope you are still loving it. If you want to know what your home is worth today, let me know.',
    },
    es: {
      D: 'Oye [first_name], 1 a\u00f1o en [property]. El tiempo vuela. Si quieres saber cu\u00e1nto vale tu casa hoy, te puedo dar los n\u00fameros.',
      I: 'Oye [first_name]! 1 a\u00f1o en tu casa. Qu\u00e9 r\u00e1pido pas\u00f3. Espero que la sigas disfrutando. Quieres que te diga cu\u00e1nto podr\u00eda valer ahora?',
      S: 'Oye [first_name], feliz 1 a\u00f1o en [property]. Espero que siga sinti\u00e9ndose como hogar. Te puedo preparar un reporte de valor para tu \u00e1rea si te interesa.',
      C: 'Oye [first_name], ya pas\u00f3 1 a\u00f1o desde que cerramos en [property]. Te puedo hacer un an\u00e1lisis de mercado para ver c\u00f3mo ha crecido tu inversi\u00f3n. Av\u00edsame si quieres los datos.',
      '': 'Oye [first_name], 1 a\u00f1o en [property]. Espero que la sigas disfrutando. Si quieres saber cu\u00e1nto vale tu casa hoy, av\u00edsame.',
    },
  },
  quarterly: {
    en: {
      D: 'Hey [first_name], just a quick market update for your area. Let me know if you want the details.',
      I: 'Hey [first_name]! Hope things are going great. Your neighborhood has had some interesting activity. Let me know if you want the scoop.',
      S: 'Hey [first_name], hope everything is well. Just wanted to share a quick update on what is happening in your neighborhood.',
      C: 'Hey [first_name], I have a market update for your area. Median prices, days on market, and recent sales. Let me know if you want the full report.',
      '': 'Hey [first_name], hope you are doing well. Here is a quick update on what is happening in your area.',
    },
    es: {
      D: 'Oye [first_name], una actualizaci\u00f3n r\u00e1pida del mercado en tu \u00e1rea. Av\u00edsame si quieres los detalles.',
      I: 'Oye [first_name]! Espero que todo vaya bien. Tu vecindario ha tenido actividad interesante. Quieres saber qu\u00e9 pas\u00f3?',
      S: 'Oye [first_name], espero que todo est\u00e9 bien. Solo quiero compartir una actualizaci\u00f3n de lo que est\u00e1 pasando en tu vecindario.',
      C: 'Oye [first_name], tengo una actualizaci\u00f3n del mercado para tu zona. Precios, d\u00edas en el mercado, y ventas recientes. Av\u00edsame si quieres el reporte completo.',
      '': 'Oye [first_name], espero que est\u00e9s bien. Aqu\u00ed tienes una actualizaci\u00f3n de lo que est\u00e1 pasando en tu \u00e1rea.',
    },
  },
};

export function generatePostCloseMessage(
  contact: MessageContact,
  milestoneType: PostCloseMilestoneType,
  milestoneLabel: string,
  propertyAddress: string
): PostCloseGeneratedMessage {
  const data = POST_CLOSE_MESSAGES[milestoneType];
  if (!data) {
    return {
      message: `Hey ${contact.first_name}, just checking in. Hope all is well.`,
      recommended_channel: 'text',
      milestone_label: milestoneLabel,
    };
  }

  const es = isSpanish(contact);
  const d = disc(contact);
  const messages = es ? data.es : data.en;
  const message = (messages[d] || messages[''])
    .replace('[first_name]', contact.first_name)
    .replace(/\[property\]/g, propertyAddress);

  return { message, recommended_channel: 'text', milestone_label: milestoneLabel };
}

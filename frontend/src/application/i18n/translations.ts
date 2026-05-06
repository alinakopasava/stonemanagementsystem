export type Language = 'en' | 'pl' | 'ru';

export const SUPPORTED_LANGUAGES: Language[] = ['en', 'pl', 'ru'];

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: 'English',
  pl: 'Polski',
  ru: 'Русский'
};

export const LANGUAGE_SHORT: Record<Language, string> = {
  en: 'EN',
  pl: 'PL',
  ru: 'RU'
};

export type TranslationKey =
  | 'header.catalog'
  | 'header.designer'
  | 'header.signIn'
  | 'header.signUp'
  | 'header.signOut'
  | 'header.signedInAs'
  | 'header.admin'
  | 'header.account'
  | 'header.language'
  | 'landing.hero.tag'
  | 'landing.hero.title'
  | 'landing.hero.subtitle'
  | 'landing.hero.designerCta'
  | 'landing.hero.contactCta'
  | 'landing.footer'
  | 'contact.title'
  | 'contact.subtitle'
  | 'contact.fullName'
  | 'contact.fullNamePlaceholder'
  | 'contact.email'
  | 'contact.emailPlaceholder'
  | 'contact.phone'
  | 'contact.phoneOptional'
  | 'contact.phonePlaceholder'
  | 'contact.message'
  | 'contact.messagePlaceholder'
  | 'contact.send'
  | 'contact.sending'
  | 'contact.privacyHint'
  | 'contact.success'
  | 'contact.error'
  | 'designer.section.tag'
  | 'designer.title'
  | 'designer.subtitle'
  | 'designer.material'
  | 'designer.finish'
  | 'designer.finish.polished'
  | 'designer.finish.honed'
  | 'designer.finish.matte'
  | 'designer.dimensions'
  | 'designer.dimensions.height'
  | 'designer.dimensions.width'
  | 'designer.dimensions.thickness'
  | 'designer.inscription'
  | 'designer.inscriptionPlaceholder'
  | 'designer.name'
  | 'designer.dates'
  | 'designer.inscriptionStyle'
  | 'designer.inscriptionStyle.preview'
  | 'designer.estimatedCost'
  | 'designer.estimatedCostHint'
  | 'designer.placeOrder'
  | 'designer.signInToOrder'
  | 'designer.submitting'
  | 'designer.success'
  | 'designer.error'
  | 'inscription.style.roman'
  | 'inscription.style.classic'
  | 'inscription.style.elegant'
  | 'inscription.style.script'
  | 'inscription.style.gothic'
  | 'inscription.style.roman.desc'
  | 'inscription.style.classic.desc'
  | 'inscription.style.elegant.desc'
  | 'inscription.style.script.desc'
  | 'inscription.style.gothic.desc'
  | 'auth.email'
  | 'auth.password'
  | 'auth.firstName'
  | 'auth.lastName'
  | 'auth.phoneOptional'
  | 'auth.confirmPassword'
  | 'auth.passwordsMismatch'
  | 'auth.req.length'
  | 'auth.req.upper'
  | 'auth.req.lower'
  | 'auth.req.digit'
  | 'signIn.title'
  | 'signIn.subtitle'
  | 'signIn.submit'
  | 'signIn.submitting'
  | 'signIn.forgot'
  | 'signIn.newHere'
  | 'signIn.createAccount'
  | 'signIn.error'
  | 'signUp.title'
  | 'signUp.subtitle'
  | 'signUp.submit'
  | 'signUp.submitting'
  | 'signUp.haveAccount'
  | 'signUp.error'
  | 'forgotPassword.title'
  | 'forgotPassword.subtitle'
  | 'forgotPassword.submit'
  | 'forgotPassword.submitting'
  | 'forgotPassword.success'
  | 'forgotPassword.error'
  | 'forgotPassword.backToSignIn'
  | 'resetPassword.title'
  | 'resetPassword.subtitle'
  | 'resetPassword.newPassword'
  | 'resetPassword.confirmPassword'
  | 'resetPassword.submit'
  | 'resetPassword.submitting'
  | 'resetPassword.tooShort'
  | 'resetPassword.error'
  | 'confirmEmail.title'
  | 'confirmEmail.subtitleWithEmail'
  | 'confirmEmail.subtitleNoEmail'
  | 'confirmEmail.tip'
  | 'confirmEmail.backToSignIn'
  | 'authCallback.finalizing'
  | 'catalog.title'
  | 'catalog.subtitle'
  | 'catalog.priceFrom'
  | 'catalog.footer';

type Dictionary = Record<TranslationKey, string>;

const en: Dictionary = {
  'header.catalog': 'Catalog',
  'header.designer': '3D Designer',
  'header.signIn': 'Sign In',
  'header.signUp': 'Sign Up',
  'header.signOut': 'Sign out',
  'header.signedInAs': 'Signed in as',
  'header.admin': 'Admin',
  'header.account': 'Account',
  'header.language': 'Language',

  'landing.hero.tag': 'Memorial Craftsmanship',
  'landing.hero.title': 'Design a dignified monument online with confidence.',
  'landing.hero.subtitle':
    'Signature Stone helps families and clients choose monument style, material, dimensions, and finish in one elegant digital flow.',
  'landing.hero.designerCta': 'Open 3D Designer',
  'landing.hero.contactCta': 'Contact us',
  'landing.footer':
    'Signature Stone — dignified memorial craftsmanship in a modern digital process.',

  'contact.title': 'Contact us',
  'contact.subtitle':
    'Tell us about your project, the monument you have in mind, or any question you may have. We will reach out as soon as possible.',
  'contact.fullName': 'Full name',
  'contact.fullNamePlaceholder': 'John Smith',
  'contact.email': 'Email',
  'contact.emailPlaceholder': 'you@example.com',
  'contact.phone': 'Phone',
  'contact.phoneOptional': '(optional)',
  'contact.phonePlaceholder': '+48 600 000 000',
  'contact.message': 'Message',
  'contact.messagePlaceholder':
    'Tell us what you have in mind: material, dimensions, inscription, deadline...',
  'contact.send': 'Send message',
  'contact.sending': 'Sending...',
  'contact.privacyHint': 'Your details are used only to reply to your message.',
  'contact.success': 'Thank you. We received your message and will get back to you shortly.',
  'contact.error': 'Failed to send message.',

  'designer.section.tag': '3D Designer',
  'designer.title': 'Design your monument in real time',
  'designer.subtitle':
    'Choose the stone, finish, size, and engraving. Drag to rotate, scroll to zoom. What you see is what we craft.',
  'designer.material': 'Material',
  'designer.finish': 'Finish',
  'designer.finish.polished': 'Polished',
  'designer.finish.honed': 'Honed',
  'designer.finish.matte': 'Matte',
  'designer.dimensions': 'Dimensions',
  'designer.dimensions.height': 'Height',
  'designer.dimensions.width': 'Width',
  'designer.dimensions.thickness': 'Thickness',
  'designer.inscription': 'Inscription',
  'designer.inscriptionPlaceholder': 'In loving memory...',
  'designer.name': 'Name',
  'designer.dates': 'Dates',
  'designer.inscriptionStyle': 'Inscription style',
  'designer.inscriptionStyle.preview': 'Preview',
  'designer.estimatedCost': 'Estimated material cost',
  'designer.estimatedCostHint':
    'Final price may include engraving and installation. Confirmed by our team.',
  'designer.placeOrder': 'Place order',
  'designer.signInToOrder': 'Sign in to place order',
  'designer.submitting': 'Submitting...',
  'designer.success': 'Order submitted successfully. Our team will contact you shortly.',
  'designer.error': 'Failed to submit order.',

  'inscription.style.roman': 'Roman',
  'inscription.style.classic': 'Classic',
  'inscription.style.elegant': 'Elegant',
  'inscription.style.script': 'Script',
  'inscription.style.gothic': 'Gothic',
  'inscription.style.roman.desc': 'Classical capitals — timeless, dignified.',
  'inscription.style.classic.desc': 'Elegant serif — formal and balanced.',
  'inscription.style.elegant.desc': 'Refined italic serif — soft and warm.',
  'inscription.style.script.desc': 'Flowing handwritten cursive.',
  'inscription.style.gothic.desc': 'Traditional blackletter — solemn.',

  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.firstName': 'First name',
  'auth.lastName': 'Last name',
  'auth.phoneOptional': 'Phone (optional)',
  'auth.confirmPassword': 'Confirm password',
  'auth.passwordsMismatch': 'Passwords do not match.',
  'auth.req.length': 'At least 8 characters',
  'auth.req.upper': 'One uppercase letter',
  'auth.req.lower': 'One lowercase letter',
  'auth.req.digit': 'One digit',

  'signIn.title': 'Sign in',
  'signIn.subtitle': 'Welcome back. Access your orders and configurator.',
  'signIn.submit': 'Sign in',
  'signIn.submitting': 'Signing in...',
  'signIn.forgot': 'Forgot?',
  'signIn.newHere': 'New here?',
  'signIn.createAccount': 'Create an account',
  'signIn.error': 'Failed to sign in.',

  'signUp.title': 'Create account',
  'signUp.subtitle': 'Join Signature Stone to place and track memorial orders.',
  'signUp.submit': 'Create account',
  'signUp.submitting': 'Creating account...',
  'signUp.haveAccount': 'Already have an account?',
  'signUp.error': 'Failed to create account.',

  'forgotPassword.title': 'Reset password',
  'forgotPassword.subtitle': "We'll email you a secure link to set a new password.",
  'forgotPassword.submit': 'Send reset link',
  'forgotPassword.submitting': 'Sending...',
  'forgotPassword.success': 'If an account exists for {email}, a reset link is on its way.',
  'forgotPassword.error': 'Failed to send reset email.',
  'forgotPassword.backToSignIn': 'Back to sign in',

  'resetPassword.title': 'Set a new password',
  'resetPassword.subtitle': 'Choose a strong, unique password.',
  'resetPassword.newPassword': 'New password',
  'resetPassword.confirmPassword': 'Confirm new password',
  'resetPassword.submit': 'Update password',
  'resetPassword.submitting': 'Updating...',
  'resetPassword.tooShort': 'Password must be at least 8 characters.',
  'resetPassword.error': 'Failed to update password.',

  'confirmEmail.title': 'Confirm your email',
  'confirmEmail.subtitleWithEmail':
    'We just sent a confirmation link to {email}. Click it to activate your account.',
  'confirmEmail.subtitleNoEmail':
    'We just sent a confirmation link to your inbox. Click it to activate your account.',
  'confirmEmail.tip':
    "Didn't get the email? Check your spam folder, or wait a minute and try again.",
  'confirmEmail.backToSignIn': 'Back to sign in',

  'authCallback.finalizing': 'Finalizing sign-in...',

  'catalog.title': 'Monument Catalog',
  'catalog.subtitle': 'Selected cemetery monument examples with pricing based on material cost.',
  'catalog.priceFrom': 'Price: from {price} PLN / m²',
  'catalog.footer': 'Signature Stone — memorial catalog.'
};

const pl: Dictionary = {
  'header.catalog': 'Katalog',
  'header.designer': 'Projektant 3D',
  'header.signIn': 'Zaloguj się',
  'header.signUp': 'Załóż konto',
  'header.signOut': 'Wyloguj się',
  'header.signedInAs': 'Zalogowano jako',
  'header.admin': 'Admin',
  'header.account': 'Konto',
  'header.language': 'Język',

  'landing.hero.tag': 'Rzemiosło pamiątkowe',
  'landing.hero.title': 'Zaprojektuj godny pomnik online z pełnym spokojem.',
  'landing.hero.subtitle':
    'Signature Stone pomaga rodzinom i klientom wybrać styl pomnika, materiał, wymiary i wykończenie w jednym eleganckim cyfrowym procesie.',
  'landing.hero.designerCta': 'Otwórz projektant 3D',
  'landing.hero.contactCta': 'Skontaktuj się',
  'landing.footer':
    'Signature Stone — godne rzemiosło pamiątkowe w nowoczesnym cyfrowym procesie.',

  'contact.title': 'Skontaktuj się z nami',
  'contact.subtitle':
    'Opowiedz nam o swoim projekcie, pomniku który masz na myśli lub o dowolnym pytaniu. Odezwiemy się tak szybko, jak to możliwe.',
  'contact.fullName': 'Imię i nazwisko',
  'contact.fullNamePlaceholder': 'Jan Kowalski',
  'contact.email': 'E-mail',
  'contact.emailPlaceholder': 'ty@przyklad.pl',
  'contact.phone': 'Telefon',
  'contact.phoneOptional': '(opcjonalnie)',
  'contact.phonePlaceholder': '+48 600 000 000',
  'contact.message': 'Wiadomość',
  'contact.messagePlaceholder':
    'Powiedz nam co masz na myśli: materiał, wymiary, inskrypcja, termin...',
  'contact.send': 'Wyślij wiadomość',
  'contact.sending': 'Wysyłanie...',
  'contact.privacyHint':
    'Twoje dane są używane wyłącznie do odpowiedzi na Twoją wiadomość.',
  'contact.success': 'Dziękujemy. Otrzymaliśmy Twoją wiadomość i wkrótce odpiszemy.',
  'contact.error': 'Nie udało się wysłać wiadomości.',

  'designer.section.tag': 'Projektant 3D',
  'designer.title': 'Zaprojektuj swój pomnik w czasie rzeczywistym',
  'designer.subtitle':
    'Wybierz kamień, wykończenie, rozmiar i grawer. Przeciągnij, aby obracać, kółkiem przybliżysz. To co widzisz, to co wykonujemy.',
  'designer.material': 'Materiał',
  'designer.finish': 'Wykończenie',
  'designer.finish.polished': 'Polerowane',
  'designer.finish.honed': 'Szlifowane',
  'designer.finish.matte': 'Matowe',
  'designer.dimensions': 'Wymiary',
  'designer.dimensions.height': 'Wysokość',
  'designer.dimensions.width': 'Szerokość',
  'designer.dimensions.thickness': 'Grubość',
  'designer.inscription': 'Inskrypcja',
  'designer.inscriptionPlaceholder': 'W kochającej pamięci...',
  'designer.name': 'Imię i nazwisko',
  'designer.dates': 'Daty',
  'designer.inscriptionStyle': 'Styl napisu',
  'designer.inscriptionStyle.preview': 'Podgląd',
  'designer.estimatedCost': 'Szacowany koszt materiału',
  'designer.estimatedCostHint':
    'Cena końcowa może obejmować grawer i montaż. Potwierdzana przez nasz zespół.',
  'designer.placeOrder': 'Złóż zamówienie',
  'designer.signInToOrder': 'Zaloguj się, aby złożyć zamówienie',
  'designer.submitting': 'Wysyłanie...',
  'designer.success':
    'Zamówienie złożone pomyślnie. Nasz zespół skontaktuje się wkrótce.',
  'designer.error': 'Nie udało się złożyć zamówienia.',

  'inscription.style.roman': 'Rzymski',
  'inscription.style.classic': 'Klasyczny',
  'inscription.style.elegant': 'Elegancki',
  'inscription.style.script': 'Pisany',
  'inscription.style.gothic': 'Gotycki',
  'inscription.style.roman.desc': 'Klasyczne kapitaliki — ponadczasowe, dostojne.',
  'inscription.style.classic.desc': 'Elegancka antykwa — formalna i wyważona.',
  'inscription.style.elegant.desc': 'Wyrafinowana kursywa — miękka i ciepła.',
  'inscription.style.script.desc': 'Płynne ręczne pismo.',
  'inscription.style.gothic.desc': 'Tradycyjny blackletter — uroczysty.',

  'auth.email': 'E-mail',
  'auth.password': 'Hasło',
  'auth.firstName': 'Imię',
  'auth.lastName': 'Nazwisko',
  'auth.phoneOptional': 'Telefon (opcjonalnie)',
  'auth.confirmPassword': 'Potwierdź hasło',
  'auth.passwordsMismatch': 'Hasła nie są zgodne.',
  'auth.req.length': 'Co najmniej 8 znaków',
  'auth.req.upper': 'Jedna wielka litera',
  'auth.req.lower': 'Jedna mała litera',
  'auth.req.digit': 'Jedna cyfra',

  'signIn.title': 'Zaloguj się',
  'signIn.subtitle': 'Witaj ponownie. Uzyskaj dostęp do swoich zamówień i konfiguratora.',
  'signIn.submit': 'Zaloguj się',
  'signIn.submitting': 'Logowanie...',
  'signIn.forgot': 'Zapomniałeś?',
  'signIn.newHere': 'Pierwszy raz?',
  'signIn.createAccount': 'Załóż konto',
  'signIn.error': 'Nie udało się zalogować.',

  'signUp.title': 'Załóż konto',
  'signUp.subtitle':
    'Dołącz do Signature Stone, aby składać i śledzić zamówienia pomników.',
  'signUp.submit': 'Załóż konto',
  'signUp.submitting': 'Tworzenie konta...',
  'signUp.haveAccount': 'Masz już konto?',
  'signUp.error': 'Nie udało się utworzyć konta.',

  'forgotPassword.title': 'Resetuj hasło',
  'forgotPassword.subtitle':
    'Wyślemy Ci bezpieczny link do ustawienia nowego hasła.',
  'forgotPassword.submit': 'Wyślij link resetujący',
  'forgotPassword.submitting': 'Wysyłanie...',
  'forgotPassword.success':
    'Jeśli istnieje konto dla {email}, link resetujący jest już w drodze.',
  'forgotPassword.error': 'Nie udało się wysłać e-maila resetującego.',
  'forgotPassword.backToSignIn': 'Wróć do logowania',

  'resetPassword.title': 'Ustaw nowe hasło',
  'resetPassword.subtitle': 'Wybierz silne, unikalne hasło.',
  'resetPassword.newPassword': 'Nowe hasło',
  'resetPassword.confirmPassword': 'Potwierdź nowe hasło',
  'resetPassword.submit': 'Zaktualizuj hasło',
  'resetPassword.submitting': 'Aktualizacja...',
  'resetPassword.tooShort': 'Hasło musi mieć co najmniej 8 znaków.',
  'resetPassword.error': 'Nie udało się zaktualizować hasła.',

  'confirmEmail.title': 'Potwierdź swój e-mail',
  'confirmEmail.subtitleWithEmail':
    'Właśnie wysłaliśmy link aktywacyjny na {email}. Kliknij w niego, aby aktywować konto.',
  'confirmEmail.subtitleNoEmail':
    'Właśnie wysłaliśmy link aktywacyjny na Twoją skrzynkę. Kliknij w niego, aby aktywować konto.',
  'confirmEmail.tip':
    'Nie dotarł e-mail? Sprawdź folder spam lub odczekaj minutę i spróbuj ponownie.',
  'confirmEmail.backToSignIn': 'Wróć do logowania',

  'authCallback.finalizing': 'Finalizowanie logowania...',

  'catalog.title': 'Katalog pomników',
  'catalog.subtitle':
    'Wybrane przykłady pomników cmentarnych z cenami opartymi na koszcie materiału.',
  'catalog.priceFrom': 'Cena: od {price} PLN / m²',
  'catalog.footer': 'Signature Stone — katalog pomników.'
};

const ru: Dictionary = {
  'header.catalog': 'Каталог',
  'header.designer': '3D Конструктор',
  'header.signIn': 'Войти',
  'header.signUp': 'Регистрация',
  'header.signOut': 'Выйти',
  'header.signedInAs': 'Вы вошли как',
  'header.admin': 'Админ',
  'header.account': 'Аккаунт',
  'header.language': 'Язык',

  'landing.hero.tag': 'Памятное мастерство',
  'landing.hero.title': 'Спроектируйте достойный памятник онлайн с уверенностью.',
  'landing.hero.subtitle':
    'Signature Stone помогает семьям и клиентам выбрать стиль, материал, размеры и отделку памятника в едином элегантном цифровом процессе.',
  'landing.hero.designerCta': 'Открыть 3D-конструктор',
  'landing.hero.contactCta': 'Связаться с нами',
  'landing.footer':
    'Signature Stone — достойное памятное мастерство в современном цифровом процессе.',

  'contact.title': 'Связаться с нами',
  'contact.subtitle':
    'Расскажите нам о вашем проекте, памятнике, который вы задумали, или о любом вопросе. Мы свяжемся с вами как можно скорее.',
  'contact.fullName': 'Имя и фамилия',
  'contact.fullNamePlaceholder': 'Иван Иванов',
  'contact.email': 'Эл. почта',
  'contact.emailPlaceholder': 'vy@example.com',
  'contact.phone': 'Телефон',
  'contact.phoneOptional': '(необязательно)',
  'contact.phonePlaceholder': '+7 900 000 00 00',
  'contact.message': 'Сообщение',
  'contact.messagePlaceholder':
    'Расскажите, что вы задумали: материал, размеры, надпись, срок...',
  'contact.send': 'Отправить сообщение',
  'contact.sending': 'Отправка...',
  'contact.privacyHint':
    'Ваши данные используются только для ответа на ваше сообщение.',
  'contact.success':
    'Спасибо. Мы получили ваше сообщение и скоро свяжемся с вами.',
  'contact.error': 'Не удалось отправить сообщение.',

  'designer.section.tag': '3D Конструктор',
  'designer.title': 'Создайте свой памятник в реальном времени',
  'designer.subtitle':
    'Выберите камень, отделку, размер и гравировку. Перетащите для вращения, прокрутите для масштабирования. Что вы видите — то мы и сделаем.',
  'designer.material': 'Материал',
  'designer.finish': 'Отделка',
  'designer.finish.polished': 'Полированная',
  'designer.finish.honed': 'Шлифованная',
  'designer.finish.matte': 'Матовая',
  'designer.dimensions': 'Размеры',
  'designer.dimensions.height': 'Высота',
  'designer.dimensions.width': 'Ширина',
  'designer.dimensions.thickness': 'Толщина',
  'designer.inscription': 'Надпись',
  'designer.inscriptionPlaceholder': 'В любящей памяти...',
  'designer.name': 'Имя',
  'designer.dates': 'Даты',
  'designer.inscriptionStyle': 'Стиль надписи',
  'designer.inscriptionStyle.preview': 'Предпросмотр',
  'designer.estimatedCost': 'Ориентировочная стоимость материала',
  'designer.estimatedCostHint':
    'Окончательная цена может включать гравировку и установку. Подтверждается нашей командой.',
  'designer.placeOrder': 'Оформить заказ',
  'designer.signInToOrder': 'Войдите, чтобы оформить заказ',
  'designer.submitting': 'Отправка...',
  'designer.success':
    'Заказ успешно отправлен. Наша команда свяжется с вами в ближайшее время.',
  'designer.error': 'Не удалось отправить заказ.',

  'inscription.style.roman': 'Римский',
  'inscription.style.classic': 'Классический',
  'inscription.style.elegant': 'Элегантный',
  'inscription.style.script': 'Прописной',
  'inscription.style.gothic': 'Готический',
  'inscription.style.roman.desc':
    'Классические капители — вневременные, торжественные.',
  'inscription.style.classic.desc':
    'Элегантная антиква — официальная и сбалансированная.',
  'inscription.style.elegant.desc':
    'Утончённый курсив — мягкий и тёплый.',
  'inscription.style.script.desc': 'Плавный рукописный курсив.',
  'inscription.style.gothic.desc':
    'Традиционный блэклеттер — торжественный.',

  'auth.email': 'Эл. почта',
  'auth.password': 'Пароль',
  'auth.firstName': 'Имя',
  'auth.lastName': 'Фамилия',
  'auth.phoneOptional': 'Телефон (необязательно)',
  'auth.confirmPassword': 'Подтвердите пароль',
  'auth.passwordsMismatch': 'Пароли не совпадают.',
  'auth.req.length': 'Не менее 8 символов',
  'auth.req.upper': 'Одна заглавная буква',
  'auth.req.lower': 'Одна строчная буква',
  'auth.req.digit': 'Одна цифра',

  'signIn.title': 'Вход',
  'signIn.subtitle': 'С возвращением. Доступ к вашим заказам и конструктору.',
  'signIn.submit': 'Войти',
  'signIn.submitting': 'Вход...',
  'signIn.forgot': 'Забыли?',
  'signIn.newHere': 'Впервые здесь?',
  'signIn.createAccount': 'Создать аккаунт',
  'signIn.error': 'Не удалось войти.',

  'signUp.title': 'Создать аккаунт',
  'signUp.subtitle':
    'Присоединяйтесь к Signature Stone, чтобы оформлять и отслеживать заказы памятников.',
  'signUp.submit': 'Создать аккаунт',
  'signUp.submitting': 'Создание аккаунта...',
  'signUp.haveAccount': 'Уже есть аккаунт?',
  'signUp.error': 'Не удалось создать аккаунт.',

  'forgotPassword.title': 'Сбросить пароль',
  'forgotPassword.subtitle':
    'Мы отправим вам безопасную ссылку для установки нового пароля.',
  'forgotPassword.submit': 'Отправить ссылку',
  'forgotPassword.submitting': 'Отправка...',
  'forgotPassword.success':
    'Если аккаунт для {email} существует, ссылка для сброса уже в пути.',
  'forgotPassword.error': 'Не удалось отправить письмо для сброса.',
  'forgotPassword.backToSignIn': 'Вернуться ко входу',

  'resetPassword.title': 'Установите новый пароль',
  'resetPassword.subtitle': 'Выберите надёжный, уникальный пароль.',
  'resetPassword.newPassword': 'Новый пароль',
  'resetPassword.confirmPassword': 'Подтвердите новый пароль',
  'resetPassword.submit': 'Обновить пароль',
  'resetPassword.submitting': 'Обновление...',
  'resetPassword.tooShort': 'Пароль должен содержать не менее 8 символов.',
  'resetPassword.error': 'Не удалось обновить пароль.',

  'confirmEmail.title': 'Подтвердите вашу почту',
  'confirmEmail.subtitleWithEmail':
    'Мы только что отправили ссылку подтверждения на {email}. Нажмите её, чтобы активировать аккаунт.',
  'confirmEmail.subtitleNoEmail':
    'Мы только что отправили ссылку подтверждения на вашу почту. Нажмите её, чтобы активировать аккаунт.',
  'confirmEmail.tip':
    'Не получили письмо? Проверьте папку спам или подождите минуту и попробуйте снова.',
  'confirmEmail.backToSignIn': 'Вернуться ко входу',

  'authCallback.finalizing': 'Завершение входа...',

  'catalog.title': 'Каталог памятников',
  'catalog.subtitle':
    'Избранные примеры кладбищенских памятников с ценами на основе стоимости материала.',
  'catalog.priceFrom': 'Цена: от {price} PLN / м²',
  'catalog.footer': 'Signature Stone — каталог памятников.'
};

export const dictionaries: Record<Language, Dictionary> = { en, pl, ru };

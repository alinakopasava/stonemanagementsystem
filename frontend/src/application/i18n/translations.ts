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
  | 'catalog.footer'
  | 'designer.shape'
  | 'designer.shape.classic'
  | 'designer.shape.rounded'
  | 'designer.shape.gothic'
  | 'designer.shape.cross'
  | 'designer.shape.heart'
  | 'designer.shape.showCross'
  | 'designer.presets.title'
  | 'designer.presets.classic.label'
  | 'designer.presets.classic.inscription'
  | 'designer.presets.classic.name'
  | 'designer.presets.classic.dates'
  | 'designer.presets.short.label'
  | 'designer.presets.short.inscription'
  | 'designer.presets.short.name'
  | 'designer.presets.short.dates'
  | 'designer.presets.family.label'
  | 'designer.presets.family.inscription'
  | 'designer.presets.family.name'
  | 'designer.presets.family.dates'
  | 'designer.presets.poetic.label'
  | 'designer.presets.poetic.inscription'
  | 'designer.presets.poetic.name'
  | 'designer.presets.poetic.dates'
  | 'designer.namePlaceholder'
  | 'designer.datesPlaceholder'
  | 'designer.pricePerM2Unit'
  | 'designer.priceUnit'
  | 'designer.units.cm'
  | 'configurator.title'
  | 'configurator.subtitle'
  | 'configurator.material'
  | 'configurator.inscription'
  | 'configurator.inscriptionPlaceholder'
  | 'configurator.finishType'
  | 'configurator.dimensions'
  | 'configurator.dimensionsPlaceholder'
  | 'configurator.readyToSubmit'
  | 'configurator.signInHint'
  | 'configurator.submit'
  | 'configurator.submitting'
  | 'configurator.signInButton'
  | 'configurator.success'
  | 'configurator.error'
  | 'hero.imageAlt'
  | 'featured.imageAlt'
  | 'admin.common.refresh'
  | 'admin.common.loading'
  | 'admin.common.unknown'
  | 'admin.common.cancel'
  | 'admin.common.delete'
  | 'admin.common.close'
  | 'admin.orders.title'
  | 'admin.orders.subtitle'
  | 'admin.orders.loadError'
  | 'admin.orders.updateError'
  | 'admin.orders.empty'
  | 'admin.orders.created'
  | 'admin.orders.clientId'
  | 'admin.orders.noDetails'
  | 'admin.orders.unknownMaterial'
  | 'admin.orders.dimensions'
  | 'admin.orders.finish'
  | 'admin.orders.inscription'
  | 'admin.orders.status.pending'
  | 'admin.orders.status.inProgress'
  | 'admin.orders.status.completed'
  | 'admin.orders.status.cancelled'
  | 'admin.orderCards.title'
  | 'admin.orderCards.subtitle'
  | 'admin.orderCards.loadError'
  | 'admin.orderCards.convertError'
  | 'admin.orderCards.alreadyOrdered'
  | 'admin.orderCards.deleteError'
  | 'admin.orderCards.deleteConfirm'
  | 'admin.orderCards.empty'
  | 'admin.orderCards.filter.toProcess'
  | 'admin.orderCards.filter.converted'
  | 'admin.orderCards.filter.all'
  | 'admin.orderCards.pendingBadge'
  | 'admin.orderCards.cardNumber'
  | 'admin.orderCards.clientId'
  | 'admin.orderCards.unknownUser'
  | 'admin.orderCards.convertedBadge'
  | 'admin.orderCards.pendingStateBadge'
  | 'admin.orderCards.noDetails'
  | 'admin.orderCards.dimensions'
  | 'admin.orderCards.finish'
  | 'admin.orderCards.pricePerM2'
  | 'admin.orderCards.inscription'
  | 'admin.orderCards.unknownMaterial'
  | 'admin.orderCards.noPrice'
  | 'admin.orderCards.dueLabel'
  | 'admin.orderCards.convertButton'
  | 'admin.orderCards.modalTitle'
  | 'admin.orderCards.price'
  | 'admin.orderCards.pricePlaceholder'
  | 'admin.orderCards.installationAddress'
  | 'admin.orderCards.installationAddressPlaceholder'
  | 'admin.orderCards.contractDetails'
  | 'admin.orderCards.contractDetailsPlaceholder'
  | 'admin.orderCards.deadline'
  | 'admin.orderCards.priceHint'
  | 'admin.orderCards.converting'
  | 'admin.orderCards.createOrder'
  | 'admin.users.title'
  | 'admin.users.subtitle'
  | 'admin.users.loadError'
  | 'admin.users.updateError'
  | 'admin.users.empty'
  | 'admin.users.user'
  | 'admin.users.email'
  | 'admin.users.phone'
  | 'admin.users.created'
  | 'admin.users.role'
  | 'admin.users.role.klient'
  | 'admin.users.role.monter'
  | 'admin.users.role.admin'
  | 'admin.messages.title'
  | 'admin.messages.subtitle'
  | 'admin.messages.loadError'
  | 'admin.messages.updateError'
  | 'admin.messages.deleteError'
  | 'admin.messages.deleteConfirm'
  | 'admin.messages.empty'
  | 'admin.messages.newBadge'
  | 'admin.messages.filter.all'
  | 'admin.messages.filter.new'
  | 'admin.messages.filter.read'
  | 'admin.messages.filter.archived'
  | 'admin.messages.markRead'
  | 'admin.messages.markNew'
  | 'admin.messages.archive'
  | 'admin.messages.delete';

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
  'catalog.footer': 'Signature Stone — memorial catalog.',

  'designer.shape': 'Shape',
  'designer.shape.classic': 'Classic',
  'designer.shape.rounded': 'Rounded',
  'designer.shape.gothic': 'Gothic',
  'designer.shape.cross': 'With cross',
  'designer.shape.heart': 'Heart',
  'designer.shape.showCross': 'Cross on top',

  'designer.presets.title': 'Ready-made texts',
  'designer.presets.classic.label': 'Classic',
  'designer.presets.classic.inscription': 'Forever in our hearts',
  'designer.presets.classic.name': 'John Smith',
  'designer.presets.classic.dates': '1948 — 2022',
  'designer.presets.short.label': 'Short',
  'designer.presets.short.inscription': 'Rest in peace',
  'designer.presets.short.name': 'Mary Brown',
  'designer.presets.short.dates': '1956 — 2021',
  'designer.presets.family.label': 'Family',
  'designer.presets.family.inscription': 'To our beloved Mother\nand Grandmother',
  'designer.presets.family.name': 'Sophia Green',
  'designer.presets.family.dates': '1939 — 2019',
  'designer.presets.poetic.label': 'Poetic',
  'designer.presets.poetic.inscription': 'Your kindness and love\nremain with us',
  'designer.presets.poetic.name': 'Peter Walker',
  'designer.presets.poetic.dates': '1962 — 2020',

  'designer.namePlaceholder': 'John A. Smith',
  'designer.datesPlaceholder': '1942 — 2018',
  'designer.pricePerM2Unit': 'PLN / m²',
  'designer.priceUnit': 'PLN',
  'designer.units.cm': 'cm',

  'configurator.title': 'Make Order',
  'configurator.subtitle':
    'Choose material and dimensions for your monument. Ordering is available only after login.',
  'configurator.material': 'Material',
  'configurator.inscription': 'Inscription Text',
  'configurator.inscriptionPlaceholder': 'Beloved forever...',
  'configurator.finishType': 'Finish Type',
  'configurator.dimensions': 'Dimensions',
  'configurator.dimensionsPlaceholder': 'e.g. 180x60 (cm)',
  'configurator.readyToSubmit': 'Signed in — ready to submit.',
  'configurator.signInHint': 'Please sign in first to unlock order submission.',
  'configurator.submit': 'Make Order',
  'configurator.submitting': 'Submitting...',
  'configurator.signInButton': 'Sign in to order',
  'configurator.success': 'Order submitted successfully.',
  'configurator.error': 'Failed to submit order.',

  'hero.imageAlt': 'Monument craftsmanship preview',
  'featured.imageAlt': '{name} monument',

  'admin.common.refresh': 'Refresh',
  'admin.common.loading': 'Loading...',
  'admin.common.unknown': 'unknown',
  'admin.common.cancel': 'Cancel',
  'admin.common.delete': 'Delete',
  'admin.common.close': 'Close',

  'admin.orders.title': 'Orders',
  'admin.orders.subtitle':
    'All client orders across the shop. Change status as the work progresses.',
  'admin.orders.loadError': 'Failed to load orders.',
  'admin.orders.updateError': 'Failed to update status.',
  'admin.orders.empty': 'No orders yet.',
  'admin.orders.created': 'Created:',
  'admin.orders.clientId': 'Client id:',
  'admin.orders.noDetails': 'No details on this order.',
  'admin.orders.unknownMaterial': 'Unknown material',
  'admin.orders.dimensions': 'Dimensions',
  'admin.orders.finish': 'Finish',
  'admin.orders.inscription': 'Inscription',
  'admin.orders.status.pending': 'Pending',
  'admin.orders.status.inProgress': 'In progress',
  'admin.orders.status.completed': 'Completed',
  'admin.orders.status.cancelled': 'Cancelled',

  'admin.orderCards.title': 'Order cards',
  'admin.orderCards.subtitle':
    'New orders awaiting installation details before being added to the production queue.',
  'admin.orderCards.loadError': 'Failed to load order cards.',
  'admin.orderCards.convertError': 'Failed to convert.',
  'admin.orderCards.alreadyOrdered': 'This card already has an order. Delete the order first.',
  'admin.orderCards.deleteError': 'Failed to delete order card.',
  'admin.orderCards.deleteConfirm': 'Delete this order card and its details? This cannot be undone.',
  'admin.orderCards.empty': 'No order cards.',
  'admin.orderCards.filter.toProcess': 'To process',
  'admin.orderCards.filter.converted': 'Converted',
  'admin.orderCards.filter.all': 'All',
  'admin.orderCards.pendingBadge': '{count} pending',
  'admin.orderCards.cardNumber': 'Card #',
  'admin.orderCards.clientId': 'Client id:',
  'admin.orderCards.unknownUser': 'unknown user',
  'admin.orderCards.convertedBadge': 'Converted · #{id}',
  'admin.orderCards.pendingStateBadge': 'Pending',
  'admin.orderCards.noDetails': 'No details on this card.',
  'admin.orderCards.dimensions': 'Dimensions',
  'admin.orderCards.finish': 'Finish',
  'admin.orderCards.pricePerM2': 'Price/m²',
  'admin.orderCards.inscription': 'Inscription',
  'admin.orderCards.unknownMaterial': 'Unknown material',
  'admin.orderCards.noPrice': 'No price set',
  'admin.orderCards.dueLabel': 'due {date}',
  'admin.orderCards.convertButton': 'Convert to order',
  'admin.orderCards.modalTitle': 'Convert to order',
  'admin.orderCards.price': 'Price (PLN)',
  'admin.orderCards.pricePlaceholder': 'e.g. 4250.00',
  'admin.orderCards.installationAddress': 'Installation address',
  'admin.orderCards.installationAddressPlaceholder': 'Street, city, cemetery...',
  'admin.orderCards.contractDetails': 'Contract details',
  'admin.orderCards.contractDetailsPlaceholder': 'Special arrangements, payment schedule, notes...',
  'admin.orderCards.deadline': 'Deadline',
  'admin.orderCards.priceHint': 'Suggested from material × area. Leave blank if not yet known.',
  'admin.orderCards.converting': 'Converting...',
  'admin.orderCards.createOrder': 'Create order',

  'admin.users.title': 'Users',
  'admin.users.subtitle': 'Grant monter or admin roles. New sign-ups default to klient.',
  'admin.users.loadError': 'Failed to load users.',
  'admin.users.updateError': 'Failed to update role.',
  'admin.users.empty': 'No users yet.',
  'admin.users.user': 'User',
  'admin.users.email': 'Email',
  'admin.users.phone': 'Phone',
  'admin.users.created': 'Created',
  'admin.users.role': 'Role',
  'admin.users.role.klient': 'client',
  'admin.users.role.monter': 'installer',
  'admin.users.role.admin': 'admin',

  'admin.messages.title': 'Messages',
  'admin.messages.subtitle': 'Incoming contact form messages from the landing page.',
  'admin.messages.loadError': 'Failed to load messages.',
  'admin.messages.updateError': 'Failed to update message.',
  'admin.messages.deleteError': 'Failed to delete message.',
  'admin.messages.deleteConfirm': 'Delete this message? This cannot be undone.',
  'admin.messages.empty': 'No messages.',
  'admin.messages.newBadge': '{count} new',
  'admin.messages.filter.all': 'All',
  'admin.messages.filter.new': 'New',
  'admin.messages.filter.read': 'Read',
  'admin.messages.filter.archived': 'Archived',
  'admin.messages.markRead': 'Mark as read',
  'admin.messages.markNew': 'Mark as new',
  'admin.messages.archive': 'Archive',
  'admin.messages.delete': 'Delete'
};

const pl: Dictionary = {
  'header.catalog': 'Katalog',
  'header.designer': 'Konfigurator',
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
  'landing.hero.designerCta': 'Otwórz konfigurator',
  'landing.hero.contactCta': 'Skontaktuj się z nami',
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
  'catalog.footer': 'Signature Stone — katalog pomników.',

  'designer.shape': 'Kształt',
  'designer.shape.classic': 'Klasyczny',
  'designer.shape.rounded': 'Półokrągły',
  'designer.shape.gothic': 'Gotycki',
  'designer.shape.cross': 'Z krzyżem',
  'designer.shape.heart': 'Sercowy',
  'designer.shape.showCross': 'Krzyż na szczycie',

  'designer.presets.title': 'Gotowe teksty',
  'designer.presets.classic.label': 'Klasyczny',
  'designer.presets.classic.inscription': 'Na zawsze w naszych sercach',
  'designer.presets.classic.name': 'Jan Kowalski',
  'designer.presets.classic.dates': '1948 — 2022',
  'designer.presets.short.label': 'Krótki',
  'designer.presets.short.inscription': 'Spoczywaj w pokoju',
  'designer.presets.short.name': 'Maria Nowak',
  'designer.presets.short.dates': '1956 — 2021',
  'designer.presets.family.label': 'Rodzinny',
  'designer.presets.family.inscription': 'Kochanej Mamie\ni Babci',
  'designer.presets.family.name': 'Zofia Zielińska',
  'designer.presets.family.dates': '1939 — 2019',
  'designer.presets.poetic.label': 'Poetycki',
  'designer.presets.poetic.inscription': 'Twoje dobro i miłość\npozostaną z nami',
  'designer.presets.poetic.name': 'Piotr Wiśniewski',
  'designer.presets.poetic.dates': '1962 — 2020',

  'designer.namePlaceholder': 'Jan Kowalski',
  'designer.datesPlaceholder': '1942 — 2018',
  'designer.pricePerM2Unit': 'PLN / m²',
  'designer.priceUnit': 'PLN',
  'designer.units.cm': 'cm',

  'configurator.title': 'Złóż zamówienie',
  'configurator.subtitle':
    'Wybierz materiał i wymiary dla swojego pomnika. Składanie zamówień dostępne tylko po zalogowaniu.',
  'configurator.material': 'Materiał',
  'configurator.inscription': 'Tekst inskrypcji',
  'configurator.inscriptionPlaceholder': 'Na zawsze ukochani...',
  'configurator.finishType': 'Wykończenie',
  'configurator.dimensions': 'Wymiary',
  'configurator.dimensionsPlaceholder': 'np. 180x60 (cm)',
  'configurator.readyToSubmit': 'Zalogowano — możesz wysłać zamówienie.',
  'configurator.signInHint': 'Zaloguj się, aby odblokować składanie zamówień.',
  'configurator.submit': 'Złóż zamówienie',
  'configurator.submitting': 'Wysyłanie...',
  'configurator.signInButton': 'Zaloguj się, aby zamówić',
  'configurator.success': 'Zamówienie złożone pomyślnie.',
  'configurator.error': 'Nie udało się złożyć zamówienia.',

  'hero.imageAlt': 'Podgląd rzemiosła pomnikowego',
  'featured.imageAlt': 'Pomnik {name}',

  'admin.common.refresh': 'Odśwież',
  'admin.common.loading': 'Wczytywanie...',
  'admin.common.unknown': 'nieznany',
  'admin.common.cancel': 'Anuluj',
  'admin.common.delete': 'Usuń',
  'admin.common.close': 'Zamknij',

  'admin.orders.title': 'Zamówienia',
  'admin.orders.subtitle':
    'Wszystkie zamówienia klientów. Zmieniaj status w miarę postępu prac.',
  'admin.orders.loadError': 'Nie udało się wczytać zamówień.',
  'admin.orders.updateError': 'Nie udało się zaktualizować statusu.',
  'admin.orders.empty': 'Brak zamówień.',
  'admin.orders.created': 'Utworzono:',
  'admin.orders.clientId': 'ID klienta:',
  'admin.orders.noDetails': 'Brak szczegółów dla tego zamówienia.',
  'admin.orders.unknownMaterial': 'Nieznany materiał',
  'admin.orders.dimensions': 'Wymiary',
  'admin.orders.finish': 'Wykończenie',
  'admin.orders.inscription': 'Inskrypcja',
  'admin.orders.status.pending': 'Oczekujące',
  'admin.orders.status.inProgress': 'W realizacji',
  'admin.orders.status.completed': 'Zrealizowane',
  'admin.orders.status.cancelled': 'Anulowane',

  'admin.orderCards.title': 'Karty zamówień',
  'admin.orderCards.subtitle':
    'Nowe zamówienia oczekujące na uzupełnienie szczegółów montażu przed dodaniem do kolejki produkcji.',
  'admin.orderCards.loadError': 'Nie udało się wczytać kart zamówień.',
  'admin.orderCards.convertError': 'Nie udało się przekształcić.',
  'admin.orderCards.alreadyOrdered':
    'Ta karta ma już zamówienie. Najpierw usuń istniejące zamówienie.',
  'admin.orderCards.deleteError': 'Nie udało się usunąć karty zamówienia.',
  'admin.orderCards.deleteConfirm':
    'Usunąć tę kartę zamówienia i jej szczegóły? Tej operacji nie można cofnąć.',
  'admin.orderCards.empty': 'Brak kart zamówień.',
  'admin.orderCards.filter.toProcess': 'Do obsługi',
  'admin.orderCards.filter.converted': 'Przekształcone',
  'admin.orderCards.filter.all': 'Wszystkie',
  'admin.orderCards.pendingBadge': '{count} oczekujących',
  'admin.orderCards.cardNumber': 'Karta #',
  'admin.orderCards.clientId': 'ID klienta:',
  'admin.orderCards.unknownUser': 'nieznany użytkownik',
  'admin.orderCards.convertedBadge': 'Przekształcona · #{id}',
  'admin.orderCards.pendingStateBadge': 'Oczekuje',
  'admin.orderCards.noDetails': 'Brak szczegółów dla tej karty.',
  'admin.orderCards.dimensions': 'Wymiary',
  'admin.orderCards.finish': 'Wykończenie',
  'admin.orderCards.pricePerM2': 'Cena/m²',
  'admin.orderCards.inscription': 'Inskrypcja',
  'admin.orderCards.unknownMaterial': 'Nieznany materiał',
  'admin.orderCards.noPrice': 'Brak ceny',
  'admin.orderCards.dueLabel': 'termin {date}',
  'admin.orderCards.convertButton': 'Przekształć w zamówienie',
  'admin.orderCards.modalTitle': 'Przekształć w zamówienie',
  'admin.orderCards.price': 'Cena (PLN)',
  'admin.orderCards.pricePlaceholder': 'np. 4250.00',
  'admin.orderCards.installationAddress': 'Adres montażu',
  'admin.orderCards.installationAddressPlaceholder': 'Ulica, miasto, cmentarz...',
  'admin.orderCards.contractDetails': 'Szczegóły umowy',
  'admin.orderCards.contractDetailsPlaceholder':
    'Specjalne ustalenia, harmonogram płatności, notatki...',
  'admin.orderCards.deadline': 'Termin',
  'admin.orderCards.priceHint':
    'Sugerowana z materiału × powierzchnia. Pozostaw puste, jeśli jeszcze nieznana.',
  'admin.orderCards.converting': 'Przekształcanie...',
  'admin.orderCards.createOrder': 'Utwórz zamówienie',

  'admin.users.title': 'Użytkownicy',
  'admin.users.subtitle': 'Przyznawaj role monter lub admin. Nowi użytkownicy mają domyślnie rolę klient.',
  'admin.users.loadError': 'Nie udało się wczytać użytkowników.',
  'admin.users.updateError': 'Nie udało się zaktualizować roli.',
  'admin.users.empty': 'Brak użytkowników.',
  'admin.users.user': 'Użytkownik',
  'admin.users.email': 'E-mail',
  'admin.users.phone': 'Telefon',
  'admin.users.created': 'Utworzono',
  'admin.users.role': 'Rola',
  'admin.users.role.klient': 'klient',
  'admin.users.role.monter': 'monter',
  'admin.users.role.admin': 'admin',

  'admin.messages.title': 'Wiadomości',
  'admin.messages.subtitle': 'Przychodzące wiadomości z formularza kontaktowego.',
  'admin.messages.loadError': 'Nie udało się wczytać wiadomości.',
  'admin.messages.updateError': 'Nie udało się zaktualizować wiadomości.',
  'admin.messages.deleteError': 'Nie udało się usunąć wiadomości.',
  'admin.messages.deleteConfirm':
    'Usunąć tę wiadomość? Tej operacji nie można cofnąć.',
  'admin.messages.empty': 'Brak wiadomości.',
  'admin.messages.newBadge': '{count} nowych',
  'admin.messages.filter.all': 'Wszystkie',
  'admin.messages.filter.new': 'Nowe',
  'admin.messages.filter.read': 'Przeczytane',
  'admin.messages.filter.archived': 'Zarchiwizowane',
  'admin.messages.markRead': 'Oznacz jako przeczytane',
  'admin.messages.markNew': 'Oznacz jako nowe',
  'admin.messages.archive': 'Archiwizuj',
  'admin.messages.delete': 'Usuń'
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
  'catalog.footer': 'Signature Stone — каталог памятников.',

  'designer.shape': 'Форма',
  'designer.shape.classic': 'Классическая',
  'designer.shape.rounded': 'Полукруглая',
  'designer.shape.gothic': 'Готическая',
  'designer.shape.cross': 'С крестом',
  'designer.shape.heart': 'Сердцевидная',
  'designer.shape.showCross': 'Крест на вершине',

  'designer.presets.title': 'Готовые тексты',
  'designer.presets.classic.label': 'Классический',
  'designer.presets.classic.inscription': 'Навсегда в наших сердцах',
  'designer.presets.classic.name': 'Иван Иванов',
  'designer.presets.classic.dates': '1948 — 2022',
  'designer.presets.short.label': 'Короткий',
  'designer.presets.short.inscription': 'Покойся с миром',
  'designer.presets.short.name': 'Мария Новак',
  'designer.presets.short.dates': '1956 — 2021',
  'designer.presets.family.label': 'Семейный',
  'designer.presets.family.inscription': 'Любимой Маме\nи Бабушке',
  'designer.presets.family.name': 'София Зелинская',
  'designer.presets.family.dates': '1939 — 2019',
  'designer.presets.poetic.label': 'Поэтичный',
  'designer.presets.poetic.inscription': 'Твоя доброта и любовь\nостаются с нами',
  'designer.presets.poetic.name': 'Пётр Вишневский',
  'designer.presets.poetic.dates': '1962 — 2020',

  'designer.namePlaceholder': 'Иван Иванов',
  'designer.datesPlaceholder': '1942 — 2018',
  'designer.pricePerM2Unit': 'PLN / м²',
  'designer.priceUnit': 'PLN',
  'designer.units.cm': 'см',

  'configurator.title': 'Оформить заказ',
  'configurator.subtitle':
    'Выберите материал и размеры для вашего памятника. Оформление заказа доступно только после входа.',
  'configurator.material': 'Материал',
  'configurator.inscription': 'Текст надписи',
  'configurator.inscriptionPlaceholder': 'Любимым навсегда...',
  'configurator.finishType': 'Тип отделки',
  'configurator.dimensions': 'Размеры',
  'configurator.dimensionsPlaceholder': 'напр. 180x60 (см)',
  'configurator.readyToSubmit': 'Вы вошли — можно отправить заказ.',
  'configurator.signInHint': 'Войдите, чтобы разблокировать отправку заказа.',
  'configurator.submit': 'Оформить заказ',
  'configurator.submitting': 'Отправка...',
  'configurator.signInButton': 'Войти для заказа',
  'configurator.success': 'Заказ успешно отправлен.',
  'configurator.error': 'Не удалось отправить заказ.',

  'hero.imageAlt': 'Превью мемориального мастерства',
  'featured.imageAlt': 'Памятник {name}',

  'admin.common.refresh': 'Обновить',
  'admin.common.loading': 'Загрузка...',
  'admin.common.unknown': 'неизвестно',
  'admin.common.cancel': 'Отмена',
  'admin.common.delete': 'Удалить',
  'admin.common.close': 'Закрыть',

  'admin.orders.title': 'Заказы',
  'admin.orders.subtitle':
    'Все заказы клиентов. Меняйте статус по мере выполнения работы.',
  'admin.orders.loadError': 'Не удалось загрузить заказы.',
  'admin.orders.updateError': 'Не удалось обновить статус.',
  'admin.orders.empty': 'Пока нет заказов.',
  'admin.orders.created': 'Создан:',
  'admin.orders.clientId': 'ID клиента:',
  'admin.orders.noDetails': 'Нет данных по этому заказу.',
  'admin.orders.unknownMaterial': 'Неизвестный материал',
  'admin.orders.dimensions': 'Размеры',
  'admin.orders.finish': 'Отделка',
  'admin.orders.inscription': 'Надпись',
  'admin.orders.status.pending': 'Ожидает',
  'admin.orders.status.inProgress': 'В работе',
  'admin.orders.status.completed': 'Выполнен',
  'admin.orders.status.cancelled': 'Отменён',

  'admin.orderCards.title': 'Карточки заказов',
  'admin.orderCards.subtitle':
    'Новые заказы, ожидающие уточнения деталей установки перед попаданием в очередь производства.',
  'admin.orderCards.loadError': 'Не удалось загрузить карточки заказов.',
  'admin.orderCards.convertError': 'Не удалось преобразовать.',
  'admin.orderCards.alreadyOrdered':
    'У этой карточки уже есть заказ. Сначала удалите заказ.',
  'admin.orderCards.deleteError': 'Не удалось удалить карточку заказа.',
  'admin.orderCards.deleteConfirm':
    'Удалить эту карточку заказа и её детали? Это действие нельзя отменить.',
  'admin.orderCards.empty': 'Нет карточек заказов.',
  'admin.orderCards.filter.toProcess': 'К обработке',
  'admin.orderCards.filter.converted': 'Преобразованные',
  'admin.orderCards.filter.all': 'Все',
  'admin.orderCards.pendingBadge': '{count} ожидающих',
  'admin.orderCards.cardNumber': 'Карта №',
  'admin.orderCards.clientId': 'ID клиента:',
  'admin.orderCards.unknownUser': 'неизвестный пользователь',
  'admin.orderCards.convertedBadge': 'Преобразована · №{id}',
  'admin.orderCards.pendingStateBadge': 'Ожидает',
  'admin.orderCards.noDetails': 'Нет данных по этой карточке.',
  'admin.orderCards.dimensions': 'Размеры',
  'admin.orderCards.finish': 'Отделка',
  'admin.orderCards.pricePerM2': 'Цена/м²',
  'admin.orderCards.inscription': 'Надпись',
  'admin.orderCards.unknownMaterial': 'Неизвестный материал',
  'admin.orderCards.noPrice': 'Цена не указана',
  'admin.orderCards.dueLabel': 'до {date}',
  'admin.orderCards.convertButton': 'Преобразовать в заказ',
  'admin.orderCards.modalTitle': 'Преобразовать в заказ',
  'admin.orderCards.price': 'Цена (PLN)',
  'admin.orderCards.pricePlaceholder': 'напр. 4250.00',
  'admin.orderCards.installationAddress': 'Адрес установки',
  'admin.orderCards.installationAddressPlaceholder': 'Улица, город, кладбище...',
  'admin.orderCards.contractDetails': 'Детали договора',
  'admin.orderCards.contractDetailsPlaceholder':
    'Особые договорённости, график оплат, заметки...',
  'admin.orderCards.deadline': 'Срок',
  'admin.orderCards.priceHint':
    'Предложено из материала × площадь. Оставьте пустым, если ещё не известно.',
  'admin.orderCards.converting': 'Преобразование...',
  'admin.orderCards.createOrder': 'Создать заказ',

  'admin.users.title': 'Пользователи',
  'admin.users.subtitle':
    'Назначайте роли monter или admin. Новые регистрации получают роль klient по умолчанию.',
  'admin.users.loadError': 'Не удалось загрузить пользователей.',
  'admin.users.updateError': 'Не удалось обновить роль.',
  'admin.users.empty': 'Пока нет пользователей.',
  'admin.users.user': 'Пользователь',
  'admin.users.email': 'Эл. почта',
  'admin.users.phone': 'Телефон',
  'admin.users.created': 'Создан',
  'admin.users.role': 'Роль',
  'admin.users.role.klient': 'клиент',
  'admin.users.role.monter': 'монтажник',
  'admin.users.role.admin': 'админ',

  'admin.messages.title': 'Сообщения',
  'admin.messages.subtitle': 'Входящие сообщения из контактной формы.',
  'admin.messages.loadError': 'Не удалось загрузить сообщения.',
  'admin.messages.updateError': 'Не удалось обновить сообщение.',
  'admin.messages.deleteError': 'Не удалось удалить сообщение.',
  'admin.messages.deleteConfirm':
    'Удалить это сообщение? Это действие нельзя отменить.',
  'admin.messages.empty': 'Нет сообщений.',
  'admin.messages.newBadge': '{count} новых',
  'admin.messages.filter.all': 'Все',
  'admin.messages.filter.new': 'Новые',
  'admin.messages.filter.read': 'Прочитанные',
  'admin.messages.filter.archived': 'Архивированные',
  'admin.messages.markRead': 'Пометить как прочитанное',
  'admin.messages.markNew': 'Пометить как новое',
  'admin.messages.archive': 'Архивировать',
  'admin.messages.delete': 'Удалить'
};

export const dictionaries: Record<Language, Dictionary> = { en, pl, ru };

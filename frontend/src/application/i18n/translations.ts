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

/** BCP-47 locales for dates and numbers, matching the selected UI language. */
export const LANGUAGE_LOCALES: Record<Language, string> = {
  en: 'en-GB',
  pl: 'pl-PL',
  ru: 'ru-RU'
};

export type TranslationKey =
  | 'header.catalog'
  | 'header.designer'
  | 'header.signIn'
  | 'header.signUp'
  | 'header.signOut'
  | 'header.signOutError'
  | 'header.signedInAs'
  | 'header.admin'
  | 'header.installer'
  | 'header.account'
  | 'header.language'
  | 'app.loading'
  | 'app.materialsError'
  | 'app.retry'
  | 'material.africa'
  | 'material.amadeus'
  | 'material.aurora'
  | 'material.baltic'
  | 'material.gabbroDiabase'
  | 'material.gandhi'
  | 'material.juparana'
  | 'material.labradorite'
  | 'material.leznikovsky'
  | 'material.marble'
  | 'material.maslovsky'
  | 'material.silk'
  | 'material.tiffany'
  | 'material.category.stone'
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
  | 'designer.previewLoading'
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
  | 'designer.rateStale'
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
  | 'auth.tooManyAttempts'
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
  | 'resetPassword.invalidLink'
  | 'resetPassword.requestNewLink'
  | 'confirmEmail.title'
  | 'confirmEmail.subtitleWithEmail'
  | 'confirmEmail.subtitleNoEmail'
  | 'confirmEmail.tip'
  | 'confirmEmail.backToSignIn'
  | 'authCallback.finalizing'
  | 'authCallback.error'
  | 'authCallback.backToSignIn'
  | 'catalog.title'
  | 'catalog.subtitle'
  | 'catalog.priceFrom'
  | 'catalog.footer'
  | 'catalog.material.label'
  | 'catalog.material.pricePerM2'
  | 'catalog.designCta'
  | 'catalog.basePriceFrom'
  | 'catalog.previewLoading'
  | 'catalog.previewError'
  | 'catalog.empty'
  | 'catalog.emptyHint'
  | 'catalog.shapeTagline'
  | 'designer.shape'
  | 'designer.shape.classic'
  | 'designer.shape.rounded'
  | 'designer.shape.gothic'
  | 'designer.shape.cross'
  | 'designer.shape.heart'
  | 'designer.shape.stele'
  | 'designer.shape.concave'
  | 'designer.shape.asymmetric'
  | 'designer.shape.crossTop'
  | 'designer.shape.curvy'
  | 'designer.shape.waveSteep'
  | 'designer.shape.dome'
  | 'designer.shape.arc'
  | 'designer.shape.showCross'
  | 'designer.stelaSize'
  | 'designer.size.standards'
  | 'designer.size.standard1'
  | 'designer.size.standard1.detail'
  | 'designer.size.standard2'
  | 'designer.size.standard2.detail'
  | 'designer.baseSize'
  | 'designer.baseSize.height'
  | 'designer.baseSize.width'
  | 'designer.baseSize.depth'
  | 'designer.elements'
  | 'designer.elements.flowerbed'
  | 'designer.elements.flowerbed.hint'
  | 'designer.elements.tombstoneSlab'
  | 'designer.elements.tombstoneSlab.hint'
  | 'designer.slabVariant'
  | 'designer.slabVariant.none'
  | 'designer.slabVariant.half'
  | 'designer.slabVariant.full'
  | 'designer.slabThickness'
  | 'designer.slabThickness.hint'
  | 'designer.decoration'
  | 'designer.decoration.none'
  | 'designer.decoration.portrait'
  | 'designer.decoration.cross'
  | 'designer.photo'
  | 'designer.photo.upload'
  | 'designer.photo.change'
  | 'designer.photo.remove'
  | 'designer.photo.hint'
  | 'designer.photo.removeBg'
  | 'designer.photo.restoreBg'
  | 'designer.photo.processing'
  | 'designer.photo.processError'
  | 'designer.photo.adjust'
  | 'designer.photo.adjust.reset'
  | 'designer.photo.adjust.brightness'
  | 'designer.photo.adjust.contrast'
  | 'designer.photo.adjust.blend'
  | 'designer.photo.crop'
  | 'designer.photo.crop.reset'
  | 'designer.photo.crop.hint'
  | 'designer.photo.crop.zoom'
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
  | 'designer.tab.form'
  | 'designer.tab.size'
  | 'designer.tab.elements'
  | 'designer.tab.inscription'
  | 'designer.summary'
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
  | 'hero.tagline'
  | 'hero.motto'
  | 'featured.imageAlt'
  | 'featured.scrollPrev'
  | 'featured.scrollNext'
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
  | 'admin.orders.filter.all'
  | 'admin.orders.changeStatus'
  | 'admin.orders.workshopSheet'
  | 'admin.orders.workshopSheetError'
  | 'designer.photoUploadError'
  | 'admin.orders.emptyFilter'
  | 'admin.orders.handOver'
  | 'admin.orders.handingOver'
  | 'admin.orders.handedOver'
  | 'admin.orders.installationReport'
  | 'admin.orders.completedAt'
  | 'admin.orders.installationPhoto'
  | 'admin.orders.handOverError'
  | 'admin.orders.notHandedOver'
  | 'admin.field.clientSection'
  | 'admin.field.orderSection'
  | 'admin.field.configSection'
  | 'admin.field.registeredName'
  | 'admin.field.contractName'
  | 'admin.field.phone'
  | 'admin.field.email'
  | 'admin.field.registeredAt'
  | 'admin.field.price'
  | 'admin.field.installationAddress'
  | 'admin.field.contractDetails'
  | 'admin.field.deadline'
  | 'admin.field.passport'
  | 'admin.field.updated'
  | 'admin.field.orderCard'
  | 'admin.field.category'
  | 'admin.field.pricePerM2'
  | 'admin.field.material'
  | 'admin.field.notProvided'
  | 'admin.field.submittedAt'
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
  | 'admin.orderCards.photo'
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
  | 'admin.orderCards.clientFullName'
  | 'admin.orderCards.clientFullNamePlaceholder'
  | 'admin.orderCards.passportSeries'
  | 'admin.orderCards.passportSeriesPlaceholder'
  | 'admin.orderCards.passportNumber'
  | 'admin.orderCards.passportNumberPlaceholder'
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
  | 'admin.messages.delete'
  | 'installer.title'
  | 'installer.subtitle'
  | 'installer.readOnly'
  | 'installer.filter.all'
  | 'installer.offline'
  | 'installer.offlineNoSync'
  | 'installer.loadError'
  | 'installer.empty'
  | 'installer.emptyFilter'
  | 'installer.cardNumber'
  | 'installer.unknownClient'
  | 'installer.address'
  | 'installer.noAddress'
  | 'installer.deadline'
  | 'installer.noDeadline'
  | 'installer.noDetails'
  | 'installer.reportSection'
  | 'installer.workStatus'
  | 'installer.workerComments'
  | 'installer.workerCommentsPlaceholder'
  | 'installer.photoEvidence'
  | 'installer.choosePhoto'
  | 'installer.uploading'
  | 'installer.photoHint'
  | 'installer.replacePhoto'
  | 'installer.completedAt'
  | 'installer.save'
  | 'installer.saving'
  | 'installer.saved'
  | 'installer.saveError'
  | 'installer.openPhoto'
  | 'installer.notReported'
  | 'myOrders.title'
  | 'myOrders.subtitle'
  | 'myOrders.refresh'
  | 'myOrders.loading'
  | 'myOrders.loadError'
  | 'myOrders.empty'
  | 'myOrders.emptyHint'
  | 'myOrders.emptyCta'
  | 'myOrders.submitted'
  | 'myOrders.reference'
  | 'myOrders.noDetails'
  | 'myOrders.unknownMaterial'
  | 'myOrders.configSection'
  | 'myOrders.orderSection'
  | 'myOrders.awaitingReview'
  | 'myOrders.material'
  | 'myOrders.category'
  | 'myOrders.dimensions'
  | 'myOrders.finish'
  | 'myOrders.inscription'
  | 'myOrders.price'
  | 'myOrders.deadline'
  | 'myOrders.address'
  | 'myOrders.confirmedAt'
  | 'myOrders.notProvided'
  | 'myOrders.status.awaiting'
  | 'myOrders.status.pending'
  | 'myOrders.status.inProgress'
  | 'myOrders.status.completed'
  | 'myOrders.status.cancelled'
  | 'header.myOrders'
  | 'header.openMenu'
  | 'header.closeMenu';

type Dictionary = Record<TranslationKey, string>;

const en: Dictionary = {
  'header.catalog': 'Catalog',
  'header.designer': '3D Designer',
  'header.signIn': 'Sign in',
  'header.signUp': 'Sign up',
  'header.signOut': 'Sign out',
  'header.signOutError': 'Could not sign out. Check your connection and try again.',
  'header.signedInAs': 'Signed in as',
  'header.admin': 'Admin',
  'header.installer': 'Installation cards',
  'header.account': 'Account',
  'header.language': 'Language',

  'app.loading': 'Loading...',
  'app.materialsError': 'Failed to load materials: {message}',
  'app.retry': 'Try again',
  'material.africa': 'Africa granite',
  'material.amadeus': 'Amadeus granite',
  'material.aurora': 'Aurora granite',
  'material.baltic': 'Baltic granite',
  'material.gabbroDiabase': 'Gabbro-diabase',
  'material.gandhi': 'Gandhi granite',
  'material.juparana': 'Juparana granite',
  'material.labradorite': 'Labradorite',
  'material.leznikovsky': 'Leznikovsky granite',
  'material.marble': 'Marble',
  'material.maslovsky': 'Maslovsky granite',
  'material.silk': 'Silk granite',
  'material.tiffany': 'Tiffany granite',
  'material.category.stone': 'Stone',

  'landing.hero.title': 'Design a monument online.',
  'landing.hero.subtitle':
    'Choose the shape, stone, size, and finish in one place. See the result before it is made.',
  'landing.hero.designerCta': 'Open 3D designer',
  'landing.hero.contactCta': 'Contact us',
  'landing.footer': 'Signature Stone. You design it online. We make it.',

  'contact.title': 'Contact us',
  'contact.subtitle':
    'Tell us what you need. We will reply soon.',
  'contact.fullName': 'Full name',
  'contact.fullNamePlaceholder': 'John Smith',
  'contact.email': 'Email',
  'contact.emailPlaceholder': 'you@example.com',
  'contact.phone': 'Phone',
  'contact.phoneOptional': '(optional)',
  'contact.phonePlaceholder': '+48 600 000 000',
  'contact.message': 'Message',
  'contact.messagePlaceholder':
    'Tell us what you have in mind: material, size, inscription, deadline...',
  'contact.send': 'Send message',
  'contact.sending': 'Sending...',
  'contact.privacyHint': 'We use your details only to reply to this message.',
  'contact.success': 'Thank you. We have received your message and will reply shortly.',
  'contact.error': 'Failed to send message.',

  'designer.section.tag': '3D designer',
  'designer.title': 'Design your monument in real time',
  'designer.subtitle':
    'Choose the stone, finish, size, and engraving. Drag to rotate and scroll to zoom. What you see is what we craft.',
  'designer.previewLoading': 'Preparing the 3D scene…',
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
  'designer.rateStale': 'The exchange rate could not be refreshed, so this conversion may be out of date. The price in roubles is exact.',
  'designer.estimatedCost': 'Estimated material cost',
  'designer.estimatedCostHint':
    'The final price may include engraving and installation. Our team will confirm it.',
  'designer.placeOrder': 'Place order',
  'designer.signInToOrder': 'Sign in to place an order',
  'designer.submitting': 'Submitting...',
  'designer.success': 'Order submitted. Our team will contact you shortly.',
  'designer.error': 'Failed to submit order.',

  'inscription.style.roman': 'Roman',
  'inscription.style.classic': 'Classic',
  'inscription.style.elegant': 'Elegant',
  'inscription.style.script': 'Script',
  'inscription.style.gothic': 'Gothic',
  'inscription.style.roman.desc': 'Classical capitals. Timeless and dignified.',
  'inscription.style.classic.desc': 'Elegant serif. Formal and balanced.',
  'inscription.style.elegant.desc': 'Refined italic serif. Soft and warm.',
  'inscription.style.script.desc': 'Flowing handwritten cursive.',
  'inscription.style.gothic.desc': 'Ornate old-world lettering. Solemn and formal.',

  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.firstName': 'First name',
  'auth.lastName': 'Last name',
  'auth.phoneOptional': 'Phone (optional)',
  'auth.confirmPassword': 'Confirm password',
  'auth.passwordsMismatch': 'Passwords do not match.',
  'auth.tooManyAttempts': 'Too many attempts. Try again in a minute.',
  'auth.req.length': 'At least 8 characters',
  'auth.req.upper': 'One uppercase letter',
  'auth.req.lower': 'One lowercase letter',
  'auth.req.digit': 'One digit',

  'signIn.title': 'Sign in',
  'signIn.subtitle': 'Welcome back. Access your orders and the 3D designer.',
  'signIn.submit': 'Sign in',
  'signIn.submitting': 'Signing in...',
  'signIn.forgot': 'Forgot password?',
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
  'forgotPassword.success': 'If an account exists for {email}, we have sent a reset link.',
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
  'resetPassword.invalidLink': 'This password reset link is invalid or has expired.',
  'resetPassword.requestNewLink': 'Request a new reset link',

  'confirmEmail.title': 'Confirm your email',
  'confirmEmail.subtitleWithEmail':
    'We just sent a confirmation link to {email}. Click it to activate your account.',
  'confirmEmail.subtitleNoEmail':
    'We just sent a confirmation link to your inbox. Click it to activate your account.',
  'confirmEmail.tip':
    "Didn't get the email? Check your spam folder, or wait a minute and try again.",
  'confirmEmail.backToSignIn': 'Back to sign in',

  'authCallback.finalizing': 'Finalizing sign-in...',
  'authCallback.error': 'This sign-in link is invalid, expired, or could not be completed.',
  'authCallback.backToSignIn': 'Back to sign in',

  'catalog.title': 'Monument catalog',
  'catalog.subtitle': 'Choose a stone to preview prices, then browse the monument designs.',
  'catalog.priceFrom': 'from {price} USD / m²',
  'catalog.footer': 'Signature Stone. Memorial catalog.',
  'catalog.material.label': 'Stone material',
  'catalog.material.pricePerM2': '{price} USD / m²',
  'catalog.designCta': 'Design in 3D',
  'catalog.basePriceFrom': 'from {price} USD',
  'catalog.previewLoading': 'Loading 3D preview…',
  'catalog.previewError': 'Preview is taking too long. Scroll away and back to retry.',
  'catalog.empty': 'No stone is available in the catalogue at the moment.',
  'catalog.emptyHint': 'Please contact the office — we will help you choose a material.',
  'catalog.shapeTagline': 'Available in every stone and finish. Fully customizable in 3D.',

  'designer.shape': 'Shape',
  'designer.shape.classic': 'Classic',
  'designer.shape.rounded': 'Rounded',
  'designer.shape.gothic': 'Gothic',
  'designer.shape.cross': 'With cross',
  'designer.shape.heart': 'Heart',
  'designer.shape.stele': 'Modern stele',
  'designer.shape.concave': 'Wave',
  'designer.shape.asymmetric': 'Asymmetric wave',
  'designer.shape.crossTop': 'Wave with cross',
  'designer.shape.curvy': 'Curved sides',
  'designer.shape.waveSteep': 'Steep wave',
  'designer.shape.dome': 'Dome',
  'designer.shape.arc': 'Arc',
  'designer.shape.showCross': 'Cross on top',

  'designer.stelaSize': 'Headstone size',
  'designer.size.standards': 'Standard sizes',
  'designer.size.standard1': 'Standard 1',
  'designer.size.standard1.detail': 'Stele 100×60×10 cm · base 60×15×20 cm',
  'designer.size.standard2': 'Standard 2',
  'designer.size.standard2.detail': 'Stele 100×50×10 cm · base 50×15×20 cm',
  'designer.baseSize': 'Base size',
  'designer.baseSize.height': 'Height',
  'designer.baseSize.width': 'Width',
  'designer.baseSize.depth': 'Depth',
  'designer.elements': 'Additional elements',
  'designer.elements.flowerbed': 'Flower planter',
  'designer.elements.flowerbed.hint': 'Stone flower box in front of the base.',
  'designer.elements.tombstoneSlab': 'Grave slab',
  'designer.elements.tombstoneSlab.hint': 'Flat slab covering the grave area.',
  'designer.slabVariant': 'Grave slab type',
  'designer.slabVariant.none': 'No slab',
  'designer.slabVariant.half': 'Half slab',
  'designer.slabVariant.full': 'Full slab',
  'designer.slabThickness': 'Slab thickness',
  'designer.slabThickness.hint': 'Standard slab thickness is usually 5 or 8 cm.',
  'designer.decoration': 'Decoration',
  'designer.decoration.none': 'None',
  'designer.decoration.portrait': 'Portrait',
  'designer.decoration.cross': 'Cross',
  'designer.photo': 'Photo',
  'designer.photo.upload': 'Upload photo',
  'designer.photo.change': 'Change photo',
  'designer.photo.remove': 'Remove photo',
  'designer.photo.hint':
    'Upload a clear, well-lit photo of the face. It is cropped to fit and shown in greyscale, like a laser engraving. Front-facing photos work best.',
  'designer.photo.removeBg': 'Remove background',
  'designer.photo.restoreBg': 'Restore background',
  'designer.photo.processing': 'Processing…',
  'designer.photo.processError': 'Could not remove the background. Using the original photo.',
  'designer.photo.adjust': 'Engraving look',
  'designer.photo.adjust.reset': 'Reset',
  'designer.photo.adjust.brightness': 'Brightness',
  'designer.photo.adjust.contrast': 'Contrast',
  'designer.photo.adjust.blend': 'Blend into stone',
  'designer.photo.crop': 'Crop for monument',
  'designer.photo.crop.reset': 'Reset crop',
  'designer.photo.crop.hint':
    'Drag to reposition. Scroll or use the slider to zoom. The frame shows what appears on the stone.',
  'designer.photo.crop.zoom': 'Zoom',

  'designer.presets.title': 'Ready-made texts',
  'designer.presets.classic.label': 'Classic',
  'designer.presets.classic.inscription': 'Forever in our hearts',
  'designer.presets.classic.name': 'Maria Nowacka',
  'designer.presets.classic.dates': '1948 - 2022',
  'designer.presets.short.label': 'Short',
  'designer.presets.short.inscription': 'Rest in peace',
  'designer.presets.short.name': 'Mary Brown',
  'designer.presets.short.dates': '1956 - 2021',
  'designer.presets.family.label': 'Family',
  'designer.presets.family.inscription': 'To our beloved Mother\nand Grandmother',
  'designer.presets.family.name': 'Sophia Green',
  'designer.presets.family.dates': '1939 - 2019',
  'designer.presets.poetic.label': 'Poetic',
  'designer.presets.poetic.inscription': 'Your kindness and love\nremain with us',
  'designer.presets.poetic.name': 'Peter Walker',
  'designer.presets.poetic.dates': '1962 - 2020',

  'designer.namePlaceholder': 'John A. Smith',
  'designer.datesPlaceholder': '1942 - 2018',
  'designer.pricePerM2Unit': 'USD / m²',
  'designer.priceUnit': 'USD',
  'designer.units.cm': 'cm',
  'designer.tab.form': 'Form',
  'designer.tab.size': 'Dimensions',
  'designer.tab.elements': 'Elements',
  'designer.tab.inscription': 'Inscription',
  'designer.summary': 'Summary',

  'configurator.title': 'Place order',
  'configurator.subtitle':
    'Choose the material and size for your monument. Sign in to place an order.',
  'configurator.material': 'Material',
  'configurator.inscription': 'Inscription',
  'configurator.inscriptionPlaceholder': 'Beloved forever...',
  'configurator.finishType': 'Finish',
  'configurator.dimensions': 'Dimensions',
  'configurator.dimensionsPlaceholder': 'e.g. 180x60 (cm)',
  'configurator.readyToSubmit': 'Signed in. Ready to submit.',
  'configurator.signInHint': 'Sign in to place an order.',
  'configurator.submit': 'Place order',
  'configurator.submitting': 'Submitting...',
  'configurator.signInButton': 'Sign in to order',
  'configurator.success': 'Order submitted.',
  'configurator.error': 'Failed to submit order.',

  'hero.tagline': 'Premium monuments & professional installations',
  'hero.motto': 'Honoring their legacy, caring for their resting place.',
  'featured.imageAlt': '{name} stone',
  'featured.scrollPrev': 'Show previous stones',
  'featured.scrollNext': 'Show next stones',

  'admin.common.refresh': 'Refresh',
  'admin.common.loading': 'Loading...',
  'admin.common.unknown': 'Unknown',
  'admin.common.cancel': 'Cancel',
  'admin.common.delete': 'Delete',
  'admin.common.close': 'Close',

  'admin.field.clientSection': 'Customer',
  'admin.field.orderSection': 'Order and contract',
  'admin.field.configSection': 'What the customer configured',
  'admin.field.registeredName': 'Registered name',
  'admin.field.contractName': 'Name on contract',
  'admin.field.phone': 'Phone',
  'admin.field.email': 'Email',
  'admin.field.registeredAt': 'Registered',
  'admin.field.price': 'Price',
  'admin.field.installationAddress': 'Installation address',
  'admin.field.contractDetails': 'Contract details',
  'admin.field.deadline': 'Deadline',
  'admin.field.passport': 'Passport',
  'admin.field.updated': 'Updated',
  'admin.field.orderCard': 'Order card',
  'admin.field.category': 'Category',
  'admin.field.pricePerM2': 'Price/m²',
  'admin.field.material': 'Material',
  'admin.field.notProvided': 'Not provided',
  'admin.field.submittedAt': 'Submitted',

  'admin.orders.title': 'Orders',
  'admin.orders.subtitle': 'All customer orders. Update the status as work progresses.',
  'admin.orders.loadError': 'Failed to load orders.',
  'admin.orders.updateError': 'Failed to update status.',
  'admin.orders.empty': 'No orders yet.',
  'admin.orders.created': 'Created:',
  'admin.orders.clientId': 'Client ID:',
  'admin.orders.noDetails': 'No details for this order.',
  'admin.orders.unknownMaterial': 'Unknown material',
  'admin.orders.dimensions': 'Dimensions',
  'admin.orders.finish': 'Finish',
  'admin.orders.inscription': 'Inscription',
  'admin.orders.status.pending': 'Pending',
  'admin.orders.status.inProgress': 'In progress',
  'admin.orders.status.completed': 'Completed',
  'admin.orders.status.cancelled': 'Cancelled',
  'admin.orders.filter.all': 'All',
  'admin.orders.changeStatus': 'Change order status',
  'admin.orders.workshopSheet': 'Work sheet (PDF)',
  'admin.orders.workshopSheetError': 'Failed to build the work sheet.',
  'designer.photoUploadError':
    'The order was saved, but the photo could not be uploaded. Please contact the office.',
  'admin.orders.emptyFilter': 'No orders match this filter.',
  'admin.orders.handOver': 'Hand over to installer',
  'admin.orders.handingOver': 'Handing over...',
  'admin.orders.handedOver': 'With the installer',
  'admin.orders.installationReport': 'Installation report',
  'admin.orders.completedAt': 'Completed',
  'admin.orders.installationPhoto': 'Photograph from the installation',
  'admin.orders.handOverError': 'Failed to hand the order over.',
  'admin.orders.notHandedOver': 'Not handed over',

  'admin.orderCards.title': 'Order cards',
  'admin.orderCards.subtitle':
    'New orders waiting for installation details before they enter the production queue.',
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
  'admin.orderCards.clientId': 'Client ID:',
  'admin.orderCards.unknownUser': 'Unknown user',
  'admin.orderCards.convertedBadge': 'Converted · #{id}',
  'admin.orderCards.pendingStateBadge': 'Pending',
  'admin.orderCards.noDetails': 'No details for this card.',
  'admin.orderCards.dimensions': 'Dimensions',
  'admin.orderCards.finish': 'Finish',
  'admin.orderCards.pricePerM2': 'Price/m²',
  'admin.orderCards.inscription': 'Inscription',
  'admin.orderCards.photo': 'Customer photograph',
  'admin.orderCards.unknownMaterial': 'Unknown material',
  'admin.orderCards.noPrice': 'No price set',
  'admin.orderCards.dueLabel': 'Due {date}',
  'admin.orderCards.convertButton': 'Convert to order',
  'admin.orderCards.modalTitle': 'Convert to order',
  'admin.orderCards.price': 'Price (BYN)',
  'admin.orderCards.pricePlaceholder': 'e.g. 4250.00',
  'admin.orderCards.installationAddress': 'Installation address',
  'admin.orderCards.installationAddressPlaceholder': 'Street, city, cemetery...',
  'admin.orderCards.contractDetails': 'Contract details',
  'admin.orderCards.contractDetailsPlaceholder': 'Special arrangements, payment schedule, notes...',
  'admin.orderCards.deadline': 'Deadline',
  'admin.orderCards.priceHint': 'Suggested from material × area. Leave blank if not yet known.',
  'admin.orderCards.converting': 'Converting...',
  'admin.orderCards.createOrder': 'Create order',
  'admin.orderCards.clientFullName': 'Client full name',
  'admin.orderCards.clientFullNamePlaceholder': 'John Smith',
  'admin.orderCards.passportSeries': 'Passport series',
  'admin.orderCards.passportSeriesPlaceholder': 'AB',
  'admin.orderCards.passportNumber': 'Passport number',
  'admin.orderCards.passportNumberPlaceholder': '1234567',

  'admin.users.title': 'Users',
  'admin.users.subtitle': 'Grant installer or admin roles. New sign-ups default to client.',
  'admin.users.loadError': 'Failed to load users.',
  'admin.users.updateError': 'Failed to update role.',
  'admin.users.empty': 'No users yet.',
  'admin.users.user': 'User',
  'admin.users.email': 'Email',
  'admin.users.phone': 'Phone',
  'admin.users.created': 'Created',
  'admin.users.role': 'Role',
  'admin.users.role.klient': 'Client',
  'admin.users.role.monter': 'Installer',
  'admin.users.role.admin': 'Admin',

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
  'admin.messages.delete': 'Delete',

  'installer.title': 'Installation cards',
  'installer.subtitle':
    'A read-only worklist generated from existing orders. No database records are changed here.',
  'installer.readOnly': 'Read-only view',
  'installer.filter.all': 'All',
  'installer.offline': 'No connection — showing the list synced on {date}. It may be out of date.',
  'installer.offlineNoSync': 'No connection — the list may be out of date.',
  'installer.loadError': 'Failed to load installation cards.',
  'installer.empty': 'No jobs handed over to the crew yet.',
  'installer.emptyFilter': 'No jobs match this filter.',
  'installer.cardNumber': 'Order',
  'installer.unknownClient': 'Client not provided',
  'installer.address': 'Installation address',
  'installer.noAddress': 'Address not provided',
  'installer.deadline': 'Deadline',
  'installer.noDeadline': 'Date not scheduled',
  'installer.noDetails': 'No monument details.',
  'installer.reportSection': 'Installation report',
  'installer.workStatus': 'Work status',
  'installer.workerComments': 'Crew notes',
  'installer.workerCommentsPlaceholder': 'What was done, what is still missing...',
  'installer.photoEvidence': 'Photo evidence',
  'installer.choosePhoto': 'Choose a photo',
  'installer.uploading': 'Uploading...',
  'installer.photoHint': 'JPEG, PNG or WebP, up to 8 MB',
  'installer.replacePhoto': 'Replace photo',
  'installer.completedAt': 'Completed at',
  'installer.save': 'Save report',
  'installer.saving': 'Saving...',
  'installer.saved': 'Report saved',
  'installer.saveError': 'Failed to save the report.',
  'installer.openPhoto': 'Open photo',
  'installer.notReported': 'Not reported yet',
  'myOrders.title': 'My orders',
  'myOrders.subtitle': 'Everything you have ordered, newest first.',
  'myOrders.refresh': 'Refresh',
  'myOrders.loading': 'Loading your orders...',
  'myOrders.loadError': 'Failed to load your orders.',
  'myOrders.empty': 'You have no orders yet.',
  'myOrders.emptyHint': 'Design a monument in the configurator and your order will show up here.',
  'myOrders.emptyCta': 'Open the configurator',
  'myOrders.submitted': 'Submitted:',
  'myOrders.reference': 'Reference',
  'myOrders.noDetails': 'No configuration saved for this order.',
  'myOrders.unknownMaterial': 'Unknown material',
  'myOrders.configSection': 'Your configuration',
  'myOrders.orderSection': 'Order',
  'myOrders.awaitingReview': 'We have received your order and will confirm the price and the deadline shortly.',
  'myOrders.material': 'Material',
  'myOrders.category': 'Category',
  'myOrders.dimensions': 'Dimensions',
  'myOrders.finish': 'Finish',
  'myOrders.inscription': 'Inscription',
  'myOrders.price': 'Price',
  'myOrders.deadline': 'Deadline',
  'myOrders.address': 'Installation address',
  'myOrders.confirmedAt': 'Confirmed',
  'myOrders.notProvided': 'Not agreed yet',
  'myOrders.status.awaiting': 'Order received',
  'myOrders.status.pending': 'Collecting details',
  'myOrders.status.inProgress': 'In progress',
  'myOrders.status.completed': 'Completed',
  'myOrders.status.cancelled': 'Cancelled',
  'header.myOrders': 'My orders',
  'header.openMenu': 'Open menu',
  'header.closeMenu': 'Close menu',
};

const pl: Dictionary = {
  'header.catalog': 'Katalog',
  'header.designer': 'Konfigurator',
  'header.signIn': 'Zaloguj się',
  'header.signUp': 'Załóż konto',
  'header.signOut': 'Wyloguj się',
  'header.signOutError': 'Nie udało się wylogować. Sprawdź połączenie i spróbuj ponownie.',
  'header.signedInAs': 'Zalogowano jako',
  'header.admin': 'Administracja',
  'header.installer': 'Karty instalacyjne',
  'header.account': 'Konto',
  'header.language': 'Język',

  'app.loading': 'Wczytywanie...',
  'app.materialsError': 'Nie udało się wczytać materiałów: {message}',
  'app.retry': 'Spróbuj ponownie',
  'material.africa': 'Granit Africa',
  'material.amadeus': 'Granit Amadeus',
  'material.aurora': 'Granit Aurora',
  'material.baltic': 'Granit Baltic',
  'material.gabbroDiabase': 'Gabro-diabaz',
  'material.gandhi': 'Granit Gandhi',
  'material.juparana': 'Granit Juparana',
  'material.labradorite': 'Labradoryt',
  'material.leznikovsky': 'Granit leźnikowski',
  'material.marble': 'Marmur',
  'material.maslovsky': 'Granit masłowski',
  'material.silk': 'Granit Silk',
  'material.tiffany': 'Granit Tiffany',
  'material.category.stone': 'Kamień',

  'landing.hero.title': 'Zaprojektuj pomnik online.',
  'landing.hero.subtitle':
    'Wybierz kształt, kamień, wymiary i wykończenie w jednym miejscu. Zobaczysz wynik, zanim pomnik powstanie.',
  'landing.hero.designerCta': 'Otwórz konfigurator',
  'landing.hero.contactCta': 'Skontaktuj się z nami',
  'landing.footer': 'Signature Stone. Projektujesz pomnik online. My go wykonujemy.',

  'contact.title': 'Skontaktuj się z nami',
  'contact.subtitle':
    'Napisz, czego potrzebujesz. Odpowiemy jak najszybciej.',
  'contact.fullName': 'Imię i nazwisko',
  'contact.fullNamePlaceholder': 'Jan Kowalski',
  'contact.email': 'E-mail',
  'contact.emailPlaceholder': 'ty@przykład.pl',
  'contact.phone': 'Telefon',
  'contact.phoneOptional': '(opcjonalnie)',
  'contact.phonePlaceholder': '+48 600 000 000',
  'contact.message': 'Wiadomość',
  'contact.messagePlaceholder':
    'Napisz, co masz na myśli: materiał, wymiary, inskrypcja, termin...',
  'contact.send': 'Wyślij wiadomość',
  'contact.sending': 'Wysyłanie...',
  'contact.privacyHint': 'Twoje dane służą wyłącznie do odpowiedzi na tę wiadomość.',
  'contact.success': 'Dziękujemy. Otrzymaliśmy Twoją wiadomość i wkrótce odpiszemy.',
  'contact.error': 'Nie udało się wysłać wiadomości.',

  'designer.section.tag': 'Konfigurator 3D',
  'designer.title': 'Zaprojektuj swój pomnik na żywo',
  'designer.subtitle':
    'Wybierz kamień, wykończenie, rozmiar i grawer. Przeciągnij, aby obrócić. Przewiń, aby przybliżyć. Wykonamy to, co widzisz.',
  'designer.previewLoading': 'Przygotowywanie sceny 3D…',
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
  'designer.inscriptionPlaceholder': 'Pamięci...',
  'designer.name': 'Imię i nazwisko',
  'designer.dates': 'Daty',
  'designer.inscriptionStyle': 'Styl napisu',
  'designer.inscriptionStyle.preview': 'Podgląd',
  'designer.rateStale': 'Nie udało się odświeżyć kursu, więc przeliczenie może być nieaktualne. Cena w rublach jest dokładna.',
  'designer.estimatedCost': 'Szacowany koszt materiału',
  'designer.estimatedCostHint':
    'Cena końcowa może obejmować grawer i montaż. Nasz zespół ją potwierdzi.',
  'designer.placeOrder': 'Złóż zamówienie',
  'designer.signInToOrder': 'Zaloguj się, aby złożyć zamówienie',
  'designer.submitting': 'Wysyłanie...',
  'designer.success': 'Zamówienie złożone. Nasz zespół wkrótce się odezwie.',
  'designer.error': 'Nie udało się złożyć zamówienia.',

  'inscription.style.roman': 'Rzymski',
  'inscription.style.classic': 'Klasyczny',
  'inscription.style.elegant': 'Elegancki',
  'inscription.style.script': 'Pisany',
  'inscription.style.gothic': 'Gotycki',
  'inscription.style.roman.desc': 'Klasyczne kapitaliki. Ponadczasowe i dostojne.',
  'inscription.style.classic.desc': 'Elegancka antykwa. Formalna i wyważona.',
  'inscription.style.elegant.desc': 'Wyrafinowana kursywa. Miękka i ciepła.',
  'inscription.style.script.desc': 'Płynne pismo ręczne.',
  'inscription.style.gothic.desc': 'Ozdobne pismo dawne. Uroczyste i dostojne.',

  'auth.email': 'E-mail',
  'auth.password': 'Hasło',
  'auth.firstName': 'Imię',
  'auth.lastName': 'Nazwisko',
  'auth.phoneOptional': 'Telefon (opcjonalnie)',
  'auth.confirmPassword': 'Potwierdź hasło',
  'auth.passwordsMismatch': 'Hasła nie są zgodne.',
  'auth.tooManyAttempts': 'Zbyt wiele prób. Spróbuj za minutę.',
  'auth.req.length': 'Co najmniej 8 znaków',
  'auth.req.upper': 'Jedna wielka litera',
  'auth.req.lower': 'Jedna mała litera',
  'auth.req.digit': 'Jedna cyfra',

  'signIn.title': 'Zaloguj się',
  'signIn.subtitle': 'Witaj ponownie. Tu znajdziesz zamówienia i konfigurator.',
  'signIn.submit': 'Zaloguj się',
  'signIn.submitting': 'Logowanie...',
  'signIn.forgot': 'Nie pamiętasz hasła?',
  'signIn.newHere': 'Nie masz konta?',
  'signIn.createAccount': 'Załóż konto',
  'signIn.error': 'Nie udało się zalogować.',

  'signUp.title': 'Załóż konto',
  'signUp.subtitle':
    'Dołącz do Signature Stone, aby składać i śledzić zamówienia pomników.',
  'signUp.submit': 'Załóż konto',
  'signUp.submitting': 'Tworzenie konta...',
  'signUp.haveAccount': 'Masz już konto?',
  'signUp.error': 'Nie udało się utworzyć konta.',

  'forgotPassword.title': 'Zresetuj hasło',
  'forgotPassword.subtitle': 'Wyślemy bezpieczny link do ustawienia nowego hasła.',
  'forgotPassword.submit': 'Wyślij link resetujący',
  'forgotPassword.submitting': 'Wysyłanie...',
  'forgotPassword.success':
    'Jeśli konto dla {email} istnieje, wysłaliśmy link do zmiany hasła.',
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
  'resetPassword.invalidLink': 'Ten link do resetowania hasła jest nieprawidłowy lub wygasł.',
  'resetPassword.requestNewLink': 'Poproś o nowy link resetujący',

  'confirmEmail.title': 'Potwierdź swój e-mail',
  'confirmEmail.subtitleWithEmail':
    'Właśnie wysłaliśmy link aktywacyjny na {email}. Kliknij w niego, aby aktywować konto.',
  'confirmEmail.subtitleNoEmail':
    'Właśnie wysłaliśmy link aktywacyjny na Twoją skrzynkę. Kliknij w niego, aby aktywować konto.',
  'confirmEmail.tip':
    'Nie dotarł e-mail? Sprawdź folder spam lub odczekaj minutę i spróbuj ponownie.',
  'confirmEmail.backToSignIn': 'Wróć do logowania',

  'authCallback.finalizing': 'Trwa logowanie...',
  'authCallback.error': 'Ten link logowania jest nieprawidłowy, wygasł lub nie mógł zostać dokończony.',
  'authCallback.backToSignIn': 'Wróć do logowania',

  'catalog.title': 'Katalog pomników',
  'catalog.subtitle':
    'Wybierz kamień, aby zobaczyć orientacyjne ceny, a potem przeglądaj projekty pomników.',
  'catalog.priceFrom': 'od {price} PLN / m²',
  'catalog.footer': 'Signature Stone. Katalog pomników.',
  'catalog.material.label': 'Materiał kamienny',
  'catalog.material.pricePerM2': '{price} PLN / m²',
  'catalog.designCta': 'Projektuj w 3D',
  'catalog.basePriceFrom': 'od {price} PLN',
  'catalog.previewLoading': 'Wczytywanie podglądu 3D…',
  'catalog.previewError': 'Podgląd ładuje się zbyt długo. Przewiń kartę poza ekran i z powrotem, żeby spróbować ponownie.',
  'catalog.empty': 'W katalogu nie ma obecnie żadnego kamienia.',
  'catalog.emptyHint': 'Skontaktuj się z biurem — pomożemy dobrać materiał.',
  'catalog.shapeTagline': 'Dostępny w każdym kamieniu i wykończeniu. W pełni konfigurowalny w 3D.',

  'designer.shape': 'Kształt',
  'designer.shape.classic': 'Klasyczny',
  'designer.shape.rounded': 'Półokrągły',
  'designer.shape.gothic': 'Gotycki',
  'designer.shape.cross': 'Z krzyżem',
  'designer.shape.heart': 'Serce',
  'designer.shape.stele': 'Nowoczesna stela',
  'designer.shape.concave': 'Falowy',
  'designer.shape.asymmetric': 'Asymetryczna fala',
  'designer.shape.crossTop': 'Fala z krzyżem',
  'designer.shape.curvy': 'Falujące boki',
  'designer.shape.waveSteep': 'Stroma fala',
  'designer.shape.dome': 'Kopulasty',
  'designer.shape.arc': 'Łuk',
  'designer.shape.showCross': 'Krzyż na szczycie',

  'designer.stelaSize': 'Rozmiar steli',
  'designer.size.standards': 'Wymiary standardowe',
  'designer.size.standard1': 'Standard 1',
  'designer.size.standard1.detail': 'Stela 100×60×10 cm · podstawa 60×15×20 cm',
  'designer.size.standard2': 'Standard 2',
  'designer.size.standard2.detail': 'Stela 100×50×10 cm · podstawa 50×15×20 cm',
  'designer.baseSize': 'Rozmiar podstawy',
  'designer.baseSize.height': 'Wysokość',
  'designer.baseSize.width': 'Szerokość',
  'designer.baseSize.depth': 'Głębokość',
  'designer.elements': 'Dodatkowe elementy',
  'designer.elements.flowerbed': 'Donica na kwiaty',
  'designer.elements.flowerbed.hint': 'Kamienna donica na kwiaty przed podstawą.',
  'designer.elements.tombstoneSlab': 'Płyta nagrobna',
  'designer.elements.tombstoneSlab.hint': 'Płaska płyta przykrywająca grób.',
  'designer.slabVariant': 'Rodzaj płyty nagrobnej',
  'designer.slabVariant.none': 'Bez płyty',
  'designer.slabVariant.half': 'Półpłyta',
  'designer.slabVariant.full': 'Pełna płyta',
  'designer.slabThickness': 'Grubość płyty',
  'designer.slabThickness.hint': 'Standardowa grubość płyty to zwykle 5 lub 8 cm.',
  'designer.decoration': 'Dekoracja',
  'designer.decoration.none': 'Brak',
  'designer.decoration.portrait': 'Portret',
  'designer.decoration.cross': 'Krzyż',
  'designer.photo': 'Zdjęcie',
  'designer.photo.upload': 'Wgraj zdjęcie',
  'designer.photo.change': 'Zmień zdjęcie',
  'designer.photo.remove': 'Usuń zdjęcie',
  'designer.photo.hint':
    'Wgraj wyraźne, dobrze oświetlone zdjęcie twarzy. Program przytnie je i pokaże w skali szarości, jak grawer laserowy. Najlepiej sprawdzają się zdjęcia na wprost.',
  'designer.photo.removeBg': 'Usuń tło',
  'designer.photo.restoreBg': 'Przywróć tło',
  'designer.photo.processing': 'Przetwarzanie…',
  'designer.photo.processError': 'Nie udało się usunąć tła. Używamy oryginalnego zdjęcia.',
  'designer.photo.adjust': 'Wygląd grawerunku',
  'designer.photo.adjust.reset': 'Resetuj',
  'designer.photo.adjust.brightness': 'Jasność',
  'designer.photo.adjust.contrast': 'Kontrast',
  'designer.photo.adjust.blend': 'Wtopienie w kamień',
  'designer.photo.crop': 'Kadr na pomnik',
  'designer.photo.crop.reset': 'Resetuj kadr',
  'designer.photo.crop.hint':
    'Przeciągnij, aby przesunąć. Kółko myszy lub suwak: przybliżenie. Ramka pokazuje obszar widoczny na kamieniu.',
  'designer.photo.crop.zoom': 'Przybliżenie',

  'designer.presets.title': 'Gotowe teksty',
  'designer.presets.classic.label': 'Klasyczny',
  'designer.presets.classic.inscription': 'Na zawsze w naszych sercach',
  'designer.presets.classic.name': 'Maria Nowacka',
  'designer.presets.classic.dates': '1948 - 2022',
  'designer.presets.short.label': 'Krótki',
  'designer.presets.short.inscription': 'Spoczywaj w pokoju',
  'designer.presets.short.name': 'Maria Nowak',
  'designer.presets.short.dates': '1956 - 2021',
  'designer.presets.family.label': 'Rodzinny',
  'designer.presets.family.inscription': 'Kochanej Mamie\ni Babci',
  'designer.presets.family.name': 'Zofia Zielińska',
  'designer.presets.family.dates': '1939 - 2019',
  'designer.presets.poetic.label': 'Poetycki',
  'designer.presets.poetic.inscription': 'Twoje dobro i miłość\npozostaną z nami',
  'designer.presets.poetic.name': 'Piotr Wiśniewski',
  'designer.presets.poetic.dates': '1962 - 2020',

  'designer.namePlaceholder': 'Jan Kowalski',
  'designer.datesPlaceholder': '1942 - 2018',
  'designer.pricePerM2Unit': 'PLN / m²',
  'designer.priceUnit': 'PLN',
  'designer.units.cm': 'cm',
  'designer.tab.form': 'Forma',
  'designer.tab.size': 'Wymiary',
  'designer.tab.elements': 'Elementy',
  'designer.tab.inscription': 'Inskrypcja',
  'designer.summary': 'Podsumowanie',

  'configurator.title': 'Złóż zamówienie',
  'configurator.subtitle':
    'Wybierz materiał i wymiary pomnika. Aby złożyć zamówienie, zaloguj się.',
  'configurator.material': 'Materiał',
  'configurator.inscription': 'Tekst inskrypcji',
  'configurator.inscriptionPlaceholder': 'Na zawsze w pamięci...',
  'configurator.finishType': 'Wykończenie',
  'configurator.dimensions': 'Wymiary',
  'configurator.dimensionsPlaceholder': 'np. 180x60 (cm)',
  'configurator.readyToSubmit': 'Zalogowano. Możesz wysłać zamówienie.',
  'configurator.signInHint': 'Zaloguj się, aby złożyć zamówienie.',
  'configurator.submit': 'Złóż zamówienie',
  'configurator.submitting': 'Wysyłanie...',
  'configurator.signInButton': 'Zaloguj się, aby zamówić',
  'configurator.success': 'Zamówienie złożone.',
  'configurator.error': 'Nie udało się złożyć zamówienia.',

  'hero.tagline': 'Pomniki z najwyższej półki i profesjonalny montaż',
  'hero.motto': 'Czcimy ich pamięć, dbamy o miejsce spoczynku.',
  'featured.imageAlt': 'Kamień {name}',
  'featured.scrollPrev': 'Pokaż poprzednie kamienie',
  'featured.scrollNext': 'Pokaż następne kamienie',

  'admin.common.refresh': 'Odśwież',
  'admin.common.loading': 'Wczytywanie...',
  'admin.common.unknown': 'Nieznany',
  'admin.common.cancel': 'Anuluj',
  'admin.common.delete': 'Usuń',
  'admin.common.close': 'Zamknij',

  'admin.field.clientSection': 'Klient',
  'admin.field.orderSection': 'Zamówienie i umowa',
  'admin.field.configSection': 'Co skonfigurował klient',
  'admin.field.registeredName': 'Imię z rejestracji',
  'admin.field.contractName': 'Imię i nazwisko z umowy',
  'admin.field.phone': 'Telefon',
  'admin.field.email': 'E-mail',
  'admin.field.registeredAt': 'Rejestracja',
  'admin.field.price': 'Cena',
  'admin.field.installationAddress': 'Adres montażu',
  'admin.field.contractDetails': 'Szczegóły umowy',
  'admin.field.deadline': 'Termin',
  'admin.field.passport': 'Paszport',
  'admin.field.updated': 'Aktualizacja',
  'admin.field.orderCard': 'Karta zamówienia',
  'admin.field.category': 'Kategoria',
  'admin.field.pricePerM2': 'Cena/m²',
  'admin.field.material': 'Materiał',
  'admin.field.notProvided': 'Nie podano',
  'admin.field.submittedAt': 'Złożono',

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
  'admin.orders.filter.all': 'Wszystkie',
  'admin.orders.changeStatus': 'Zmień status zamówienia',
  'admin.orders.workshopSheet': 'Karta pracy (PDF)',
  'admin.orders.workshopSheetError': 'Nie udało się przygotować karty pracy.',
  'designer.photoUploadError':
    'Zamówienie zostało zapisane, ale nie udało się wysłać zdjęcia. Skontaktuj się z biurem.',
  'admin.orders.emptyFilter': 'Brak zamówień o tym statusie.',
  'admin.orders.handOver': 'Przekaż do montera',
  'admin.orders.handingOver': 'Przekazywanie...',
  'admin.orders.handedOver': 'U montera',
  'admin.orders.installationReport': 'Raport z montażu',
  'admin.orders.completedAt': 'Zakończono',
  'admin.orders.installationPhoto': 'Zdjęcie z montażu',
  'admin.orders.handOverError': 'Nie udało się przekazać zamówienia.',
  'admin.orders.notHandedOver': 'Nieprzekazane',

  'admin.orderCards.title': 'Karty zamówień',
  'admin.orderCards.subtitle':
    'Nowe zamówienia oczekujące na uzupełnienie szczegółów montażu przed dodaniem do kolejki produkcji.',
  'admin.orderCards.loadError': 'Nie udało się wczytać kart zamówień.',
  'admin.orderCards.convertError': 'Nie udało się przekształcić karty w zamówienie.',
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
  'admin.orderCards.unknownUser': 'Nieznany użytkownik',
  'admin.orderCards.convertedBadge': 'Przekształcona · #{id}',
  'admin.orderCards.pendingStateBadge': 'Oczekuje',
  'admin.orderCards.noDetails': 'Brak szczegółów dla tej karty.',
  'admin.orderCards.dimensions': 'Wymiary',
  'admin.orderCards.finish': 'Wykończenie',
  'admin.orderCards.pricePerM2': 'Cena/m²',
  'admin.orderCards.inscription': 'Inskrypcja',
  'admin.orderCards.photo': 'Fotografia od klienta',
  'admin.orderCards.unknownMaterial': 'Nieznany materiał',
  'admin.orderCards.noPrice': 'Brak ceny',
  'admin.orderCards.dueLabel': 'Termin: {date}',
  'admin.orderCards.convertButton': 'Przekształć w zamówienie',
  'admin.orderCards.modalTitle': 'Przekształć w zamówienie',
  'admin.orderCards.price': 'Cena (BYN)',
  'admin.orderCards.pricePlaceholder': 'np. 4250.00',
  'admin.orderCards.installationAddress': 'Adres montażu',
  'admin.orderCards.installationAddressPlaceholder': 'Ulica, miasto, cmentarz...',
  'admin.orderCards.contractDetails': 'Szczegóły umowy',
  'admin.orderCards.contractDetailsPlaceholder':
    'Specjalne ustalenia, harmonogram płatności, notatki...',
  'admin.orderCards.deadline': 'Termin',
  'admin.orderCards.priceHint':
    'Sugerowana cena z materiału i powierzchni. Zostaw puste, jeśli jeszcze nie znasz kwoty.',
  'admin.orderCards.converting': 'Przekształcanie...',
  'admin.orderCards.createOrder': 'Utwórz zamówienie',
  'admin.orderCards.clientFullName': 'Imię i nazwisko klienta',
  'admin.orderCards.clientFullNamePlaceholder': 'Jan Kowalski',
  'admin.orderCards.passportSeries': 'Seria paszportu',
  'admin.orderCards.passportSeriesPlaceholder': 'AB',
  'admin.orderCards.passportNumber': 'Numer paszportu',
  'admin.orderCards.passportNumberPlaceholder': '1234567',

  'admin.users.title': 'Użytkownicy',
  'admin.users.subtitle':
    'Nadawaj role montażysty lub administratora. Nowi użytkownicy mają domyślnie rolę klienta.',
  'admin.users.loadError': 'Nie udało się wczytać użytkowników.',
  'admin.users.updateError': 'Nie udało się zaktualizować roli.',
  'admin.users.empty': 'Brak użytkowników.',
  'admin.users.user': 'Użytkownik',
  'admin.users.email': 'E-mail',
  'admin.users.phone': 'Telefon',
  'admin.users.created': 'Utworzono',
  'admin.users.role': 'Rola',
  'admin.users.role.klient': 'Klient',
  'admin.users.role.monter': 'Montażysta',
  'admin.users.role.admin': 'Administrator',

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
  'admin.messages.delete': 'Usuń',

  'installer.title': 'Karty instalacyjne',
  'installer.subtitle':
    'Lista robocza tylko do odczytu, utworzona z istniejących zamówień. Ten widok nie zmienia danych w bazie.',
  'installer.readOnly': 'Widok tylko do odczytu',
  'installer.filter.all': 'Wszystkie',
  'installer.offline': 'Brak połączenia — lista pobrana {date}. Może być nieaktualna.',
  'installer.offlineNoSync': 'Brak połączenia — lista może być nieaktualna.',
  'installer.loadError': 'Nie udało się wczytać kart instalacyjnych.',
  'installer.empty': 'Biuro nie przekazało jeszcze żadnego zlecenia.',
  'installer.emptyFilter': 'Żadne zlecenie nie pasuje do filtra.',
  'installer.cardNumber': 'Zamówienie',
  'installer.unknownClient': 'Nie podano klienta',
  'installer.address': 'Adres montażu',
  'installer.noAddress': 'Nie podano adresu',
  'installer.deadline': 'Termin',
  'installer.noDeadline': 'Nie ustalono terminu',
  'installer.noDetails': 'Brak szczegółów pomnika.',
  'installer.reportSection': 'Raport montażu',
  'installer.workStatus': 'Status prac',
  'installer.workerComments': 'Uwagi montera',
  'installer.workerCommentsPlaceholder': 'Co zrobione, czego brakuje...',
  'installer.photoEvidence': 'Dowód zdjęciowy',
  'installer.choosePhoto': 'Wybierz zdjęcie',
  'installer.uploading': 'Wysyłanie...',
  'installer.photoHint': 'JPEG, PNG lub WebP, do 8 MB',
  'installer.replacePhoto': 'Zmień zdjęcie',
  'installer.completedAt': 'Zakończono',
  'installer.save': 'Zapisz raport',
  'installer.saving': 'Zapisywanie...',
  'installer.saved': 'Raport zapisany',
  'installer.saveError': 'Nie udało się zapisać raportu.',
  'installer.openPhoto': 'Otwórz zdjęcie',
  'installer.notReported': 'Brak raportu',
  'myOrders.title': 'Moje zamówienia',
  'myOrders.subtitle': 'Wszystko, co zamówiłeś, od najnowszych.',
  'myOrders.refresh': 'Odśwież',
  'myOrders.loading': 'Wczytywanie zamówień...',
  'myOrders.loadError': 'Nie udało się wczytać zamówień.',
  'myOrders.empty': 'Nie masz jeszcze żadnych zamówień.',
  'myOrders.emptyHint': 'Zaprojektuj pomnik w konfiguratorze, a zamówienie pojawi się tutaj.',
  'myOrders.emptyCta': 'Przejdź do konfiguratora',
  'myOrders.submitted': 'Złożone:',
  'myOrders.reference': 'Numer',
  'myOrders.noDetails': 'Brak zapisanej konfiguracji dla tego zamówienia.',
  'myOrders.unknownMaterial': 'Nieznany materiał',
  'myOrders.configSection': 'Twoja konfiguracja',
  'myOrders.orderSection': 'Zamówienie',
  'myOrders.awaitingReview': 'Przyjęliśmy zamówienie. Wkrótce potwierdzimy cenę i termin.',
  'myOrders.material': 'Materiał',
  'myOrders.category': 'Kategoria',
  'myOrders.dimensions': 'Wymiary',
  'myOrders.finish': 'Wykończenie',
  'myOrders.inscription': 'Napis',
  'myOrders.price': 'Cena',
  'myOrders.deadline': 'Termin',
  'myOrders.address': 'Adres montażu',
  'myOrders.confirmedAt': 'Potwierdzone',
  'myOrders.notProvided': 'Jeszcze nieustalone',
  'myOrders.status.awaiting': 'Zamówienie przyjęte',
  'myOrders.status.pending': 'Zbieranie informacji',
  'myOrders.status.inProgress': 'W realizacji',
  'myOrders.status.completed': 'Zrealizowane',
  'myOrders.status.cancelled': 'Anulowane',
  'header.myOrders': 'Moje zamówienia',
  'header.openMenu': 'Otwórz menu',
  'header.closeMenu': 'Zamknij menu',
};

const ru: Dictionary = {
  'header.catalog': 'Каталог',
  'header.designer': '3D-конструктор',
  'header.signIn': 'Войти',
  'header.signUp': 'Регистрация',
  'header.signOut': 'Выйти',
  'header.signOutError': 'Не удалось выйти. Проверьте подключение и повторите попытку.',
  'header.signedInAs': 'Вы вошли как',
  'header.admin': 'Администрирование',
  'header.installer': 'Карты монтажа',
  'header.account': 'Аккаунт',
  'header.language': 'Язык',

  'app.loading': 'Загрузка...',
  'app.materialsError': 'Не удалось загрузить материалы: {message}',
  'app.retry': 'Повторить',
  'material.africa': 'Гранит Africa',
  'material.amadeus': 'Гранит Amadeus',
  'material.aurora': 'Гранит Aurora',
  'material.baltic': 'Гранит Baltic',
  'material.gabbroDiabase': 'Габбро-диабаз',
  'material.gandhi': 'Гранит Gandhi',
  'material.juparana': 'Гранит Juparana',
  'material.labradorite': 'Лабрадорит',
  'material.leznikovsky': 'Лезниковский гранит',
  'material.marble': 'Мрамор',
  'material.maslovsky': 'Масловский гранит',
  'material.silk': 'Гранит Silk',
  'material.tiffany': 'Гранит Tiffany',
  'material.category.stone': 'Камень',

  'landing.hero.title': 'Создайте памятник онлайн.',
  'landing.hero.subtitle':
    'Выберите форму, камень, размеры и отделку в одном месте. Увидите результат до изготовления.',
  'landing.hero.designerCta': 'Открыть 3D-конструктор',
  'landing.hero.contactCta': 'Связаться с нами',
  'landing.footer': 'Signature Stone. Проектируете онлайн. Изготавливаем мы.',

  'contact.title': 'Связаться с нами',
  'contact.subtitle':
    'Напишите нам. Ответим как можно скорее.',
  'contact.fullName': 'Имя и фамилия',
  'contact.fullNamePlaceholder': 'Иван Иванов',
  'contact.email': 'Эл. почта',
  'contact.emailPlaceholder': 'vy@primer.ru',
  'contact.phone': 'Телефон',
  'contact.phoneOptional': '(необязательно)',
  'contact.phonePlaceholder': '+7 900 000 00 00',
  'contact.message': 'Сообщение',
  'contact.messagePlaceholder':
    'Напишите, что вы задумали: материал, размеры, надпись, срок...',
  'contact.send': 'Отправить сообщение',
  'contact.sending': 'Отправка...',
  'contact.privacyHint': 'Ваши данные нужны только для ответа на это сообщение.',
  'contact.success': 'Спасибо. Мы получили сообщение и скоро ответим.',
  'contact.error': 'Не удалось отправить сообщение.',

  'designer.section.tag': '3D-конструктор',
  'designer.title': 'Создайте памятник в реальном времени',
  'designer.subtitle':
    'Выберите камень, отделку, размер и гравировку. Перетащите, чтобы повернуть. Прокрутите, чтобы приблизить. Мы изготовим то, что вы видите.',
  'designer.previewLoading': 'Подготовка 3D-сцены…',
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
  'designer.inscriptionPlaceholder': 'Светлая память...',
  'designer.name': 'Имя и фамилия',
  'designer.dates': 'Даты',
  'designer.inscriptionStyle': 'Стиль надписи',
  'designer.inscriptionStyle.preview': 'Просмотр',
  'designer.rateStale': 'Курс не удалось обновить, поэтому пересчёт может быть неактуальным. Цена в рублях точная.',
  'designer.estimatedCost': 'Ориентировочная стоимость материала',
  'designer.estimatedCostHint':
    'Итоговая цена может включать гравировку и установку. Команда подтвердит её отдельно.',
  'designer.placeOrder': 'Оформить заказ',
  'designer.signInToOrder': 'Войдите, чтобы оформить заказ',
  'designer.submitting': 'Отправка...',
  'designer.success': 'Заказ отправлен. Мы свяжемся с вами в ближайшее время.',
  'designer.error': 'Не удалось отправить заказ.',

  'inscription.style.roman': 'Римский',
  'inscription.style.classic': 'Классический',
  'inscription.style.elegant': 'Элегантный',
  'inscription.style.script': 'Рукописный',
  'inscription.style.gothic': 'Готический',
  'inscription.style.roman.desc': 'Классические заглавные буквы. Вневременные и торжественные.',
  'inscription.style.classic.desc': 'Элегантная антиква. Официальная и уравновешенная.',
  'inscription.style.elegant.desc': 'Утончённый курсив. Мягкий и тёплый.',
  'inscription.style.script.desc': 'Плавный рукописный почерк.',
  'inscription.style.gothic.desc': 'Декоративное старинное письмо. Торжественное и строгое.',

  'auth.email': 'Эл. почта',
  'auth.password': 'Пароль',
  'auth.firstName': 'Имя',
  'auth.lastName': 'Фамилия',
  'auth.phoneOptional': 'Телефон (необязательно)',
  'auth.confirmPassword': 'Подтвердите пароль',
  'auth.passwordsMismatch': 'Пароли не совпадают.',
  'auth.tooManyAttempts': 'Слишком много попыток. Попробуйте через минуту.',
  'auth.req.length': 'Не менее 8 символов',
  'auth.req.upper': 'Одна заглавная буква',
  'auth.req.lower': 'Одна строчная буква',
  'auth.req.digit': 'Одна цифра',

  'signIn.title': 'Вход',
  'signIn.subtitle': 'С возвращением. Здесь заказы и 3D-конструктор.',
  'signIn.submit': 'Войти',
  'signIn.submitting': 'Вход...',
  'signIn.forgot': 'Не помните пароль?',
  'signIn.newHere': 'Нет аккаунта?',
  'signIn.createAccount': 'Создать аккаунт',
  'signIn.error': 'Не удалось войти.',

  'signUp.title': 'Создать аккаунт',
  'signUp.subtitle': 'Зарегистрируйтесь в Signature Stone, чтобы оформлять и отслеживать заказы.',
  'signUp.submit': 'Создать аккаунт',
  'signUp.submitting': 'Создание аккаунта...',
  'signUp.haveAccount': 'Уже есть аккаунт?',
  'signUp.error': 'Не удалось создать аккаунт.',

  'forgotPassword.title': 'Сброс пароля',
  'forgotPassword.subtitle': 'Мы отправим ссылку для установки нового пароля.',
  'forgotPassword.submit': 'Отправить ссылку',
  'forgotPassword.submitting': 'Отправка...',
  'forgotPassword.success':
    'Если аккаунт для {email} существует, мы отправили ссылку для смены пароля.',
  'forgotPassword.error': 'Не удалось отправить письмо для сброса пароля.',
  'forgotPassword.backToSignIn': 'Вернуться ко входу',

  'resetPassword.title': 'Новый пароль',
  'resetPassword.subtitle': 'Выберите надёжный уникальный пароль.',
  'resetPassword.newPassword': 'Новый пароль',
  'resetPassword.confirmPassword': 'Подтвердите новый пароль',
  'resetPassword.submit': 'Обновить пароль',
  'resetPassword.submitting': 'Обновление...',
  'resetPassword.tooShort': 'Пароль должен содержать не менее 8 символов.',
  'resetPassword.error': 'Не удалось обновить пароль.',
  'resetPassword.invalidLink': 'Ссылка для сброса пароля недействительна или истекла.',
  'resetPassword.requestNewLink': 'Запросить новую ссылку',

  'confirmEmail.title': 'Подтвердите почту',
  'confirmEmail.subtitleWithEmail':
    'Мы отправили ссылку подтверждения на {email}. Перейдите по ней, чтобы активировать аккаунт.',
  'confirmEmail.subtitleNoEmail':
    'Мы отправили ссылку подтверждения на вашу почту. Перейдите по ней, чтобы активировать аккаунт.',
  'confirmEmail.tip':
    'Письмо не пришло? Проверьте папку «Спам» или подождите минуту и попробуйте снова.',
  'confirmEmail.backToSignIn': 'Вернуться ко входу',

  'authCallback.finalizing': 'Выполняется вход...',
  'authCallback.error': 'Ссылка для входа недействительна, истекла или не может быть обработана.',
  'authCallback.backToSignIn': 'Вернуться ко входу',

  'catalog.title': 'Каталог памятников',
  'catalog.subtitle':
    'Выберите камень, чтобы увидеть ориентировочные цены, затем просмотрите модели памятников.',
  'catalog.priceFrom': 'от {price} BYN / м²',
  'catalog.footer': 'Signature Stone. Каталог памятников.',
  'catalog.material.label': 'Камень',
  'catalog.material.pricePerM2': '{price} BYN / м²',
  'catalog.designCta': 'Проектировать в 3D',
  'catalog.basePriceFrom': 'от {price} BYN',
  'catalog.previewLoading': 'Загрузка 3D-модели…',
  'catalog.previewError': 'Предпросмотр загружается слишком долго. Прокрутите карточку вне экрана и обратно, чтобы повторить.',
  'catalog.empty': 'В каталоге сейчас нет ни одного камня.',
  'catalog.emptyHint': 'Свяжитесь с офисом — мы поможем подобрать материал.',
  'catalog.shapeTagline': 'Доступен в любом камне и отделке. Полностью настраивается в 3D.',

  'designer.shape': 'Форма',
  'designer.shape.classic': 'Классическая',
  'designer.shape.rounded': 'Полукруглая',
  'designer.shape.gothic': 'Готическая',
  'designer.shape.cross': 'С крестом',
  'designer.shape.heart': 'Сердце',
  'designer.shape.stele': 'Современная стела',
  'designer.shape.concave': 'Волна',
  'designer.shape.asymmetric': 'Асимметричная волна',
  'designer.shape.crossTop': 'Волна с крестом',
  'designer.shape.curvy': 'Волнистые края',
  'designer.shape.waveSteep': 'Крутая волна',
  'designer.shape.dome': 'Купольная',
  'designer.shape.arc': 'Арка',
  'designer.shape.showCross': 'Крест на вершине',

  'designer.stelaSize': 'Размер стелы',
  'designer.size.standards': 'Стандартные размеры',
  'designer.size.standard1': 'Стандарт 1',
  'designer.size.standard1.detail': 'Стела 100×60×10 см · постамент 60×15×20 см',
  'designer.size.standard2': 'Стандарт 2',
  'designer.size.standard2.detail': 'Стела 100×50×10 см · постамент 50×15×20 см',
  'designer.baseSize': 'Размер постамента',
  'designer.baseSize.height': 'Высота',
  'designer.baseSize.width': 'Ширина',
  'designer.baseSize.depth': 'Глубина',
  'designer.elements': 'Дополнительные элементы',
  'designer.elements.flowerbed': 'Цветник',
  'designer.elements.flowerbed.hint': 'Каменный цветник перед постаментом.',
  'designer.elements.tombstoneSlab': 'Надгробная плита',
  'designer.elements.tombstoneSlab.hint': 'Плоская плита, закрывающая место захоронения.',
  'designer.slabVariant': 'Тип надгробной плиты',
  'designer.slabVariant.none': 'Без плиты',
  'designer.slabVariant.half': 'Полуплита',
  'designer.slabVariant.full': 'Полная плита',
  'designer.slabThickness': 'Толщина плиты',
  'designer.slabThickness.hint': 'Обычная толщина плиты: 5 или 8 см.',
  'designer.decoration': 'Оформление',
  'designer.decoration.none': 'Нет',
  'designer.decoration.portrait': 'Портрет',
  'designer.decoration.cross': 'Крест',
  'designer.photo': 'Фото',
  'designer.photo.upload': 'Загрузить фото',
  'designer.photo.change': 'Изменить фото',
  'designer.photo.remove': 'Удалить фото',
  'designer.photo.hint':
    'Загрузите чёткое, хорошо освещённое фото лица. Программа обрежет его под нишу и покажет в оттенках серого, как лазерную гравировку. Лучше всего подходят снимки анфас.',
  'designer.photo.removeBg': 'Удалить фон',
  'designer.photo.restoreBg': 'Вернуть фон',
  'designer.photo.processing': 'Обработка…',
  'designer.photo.processError': 'Не удалось удалить фон. Используем исходное фото.',
  'designer.photo.adjust': 'Вид гравировки',
  'designer.photo.adjust.reset': 'Сбросить',
  'designer.photo.adjust.brightness': 'Яркость',
  'designer.photo.adjust.contrast': 'Контраст',
  'designer.photo.adjust.blend': 'Впечатывание в камень',
  'designer.photo.crop': 'Кадр на памятник',
  'designer.photo.crop.reset': 'Сбросить кадр',
  'designer.photo.crop.hint':
    'Перетащите для смещения. Колёсико или ползунок: масштаб. Рамка показывает область на камне.',
  'designer.photo.crop.zoom': 'Масштаб',

  'designer.presets.title': 'Готовые тексты',
  'designer.presets.classic.label': 'Классический',
  'designer.presets.classic.inscription': 'Навсегда в наших сердцах',
  'designer.presets.classic.name': 'Мария Новацкая',
  'designer.presets.classic.dates': '1948 - 2022',
  'designer.presets.short.label': 'Короткий',
  'designer.presets.short.inscription': 'Покойся с миром',
  'designer.presets.short.name': 'Мария Петрова',
  'designer.presets.short.dates': '1956 - 2021',
  'designer.presets.family.label': 'Семейный',
  'designer.presets.family.inscription': 'Любимой маме\nи бабушке',
  'designer.presets.family.name': 'Софья Орлова',
  'designer.presets.family.dates': '1939 - 2019',
  'designer.presets.poetic.label': 'Поэтичный',
  'designer.presets.poetic.inscription': 'Твоя доброта и любовь\nостаются с нами',
  'designer.presets.poetic.name': 'Пётр Смирнов',
  'designer.presets.poetic.dates': '1962 - 2020',

  'designer.namePlaceholder': 'Иван Иванов',
  'designer.datesPlaceholder': '1942 - 2018',
  'designer.pricePerM2Unit': 'BYN / м²',
  'designer.priceUnit': 'BYN',
  'designer.units.cm': 'см',
  'designer.tab.form': 'Форма',
  'designer.tab.size': 'Размеры',
  'designer.tab.elements': 'Элементы',
  'designer.tab.inscription': 'Надпись',
  'designer.summary': 'Итог',

  'configurator.title': 'Оформить заказ',
  'configurator.subtitle':
    'Выберите материал и размеры памятника. Чтобы оформить заказ, войдите в аккаунт.',
  'configurator.material': 'Материал',
  'configurator.inscription': 'Текст надписи',
  'configurator.inscriptionPlaceholder': 'Светлая память...',
  'configurator.finishType': 'Отделка',
  'configurator.dimensions': 'Размеры',
  'configurator.dimensionsPlaceholder': 'например, 180x60 (см)',
  'configurator.readyToSubmit': 'Вы вошли. Можно отправить заказ.',
  'configurator.signInHint': 'Войдите, чтобы оформить заказ.',
  'configurator.submit': 'Оформить заказ',
  'configurator.submitting': 'Отправка...',
  'configurator.signInButton': 'Войти, чтобы заказать',
  'configurator.success': 'Заказ отправлен.',
  'configurator.error': 'Не удалось отправить заказ.',

  'hero.tagline': 'Премиальные памятники и профессиональный монтаж',
  'hero.motto': 'Чтим их память, заботимся о месте упокоения.',
  'featured.imageAlt': 'Камень {name}',
  'featured.scrollPrev': 'Показать предыдущие камни',
  'featured.scrollNext': 'Показать следующие камни',

  'admin.common.refresh': 'Обновить',
  'admin.common.loading': 'Загрузка...',
  'admin.common.unknown': 'Неизвестно',
  'admin.common.cancel': 'Отмена',
  'admin.common.delete': 'Удалить',
  'admin.common.close': 'Закрыть',

  'admin.field.clientSection': 'Клиент',
  'admin.field.orderSection': 'Заказ и договор',
  'admin.field.configSection': 'Что настроил клиент',
  'admin.field.registeredName': 'Имя при регистрации',
  'admin.field.contractName': 'ФИО по договору',
  'admin.field.phone': 'Телефон',
  'admin.field.email': 'Эл. почта',
  'admin.field.registeredAt': 'Регистрация',
  'admin.field.price': 'Цена',
  'admin.field.installationAddress': 'Адрес установки',
  'admin.field.contractDetails': 'Детали договора',
  'admin.field.deadline': 'Срок',
  'admin.field.passport': 'Паспорт',
  'admin.field.updated': 'Обновлено',
  'admin.field.orderCard': 'Карта заказа',
  'admin.field.category': 'Категория',
  'admin.field.pricePerM2': 'Цена/м²',
  'admin.field.material': 'Материал',
  'admin.field.notProvided': 'Не указано',
  'admin.field.submittedAt': 'Отправлено',

  'admin.orders.title': 'Заказы',
  'admin.orders.subtitle': 'Все заказы клиентов. Меняйте статус по ходу работы.',
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
  'admin.orders.filter.all': 'Все',
  'admin.orders.changeStatus': 'Изменить статус заказа',
  'admin.orders.workshopSheet': 'Рабочая карта (PDF)',
  'admin.orders.workshopSheetError': 'Не удалось подготовить рабочую карту.',
  'designer.photoUploadError':
    'Заказ сохранён, но фотографию не удалось загрузить. Свяжитесь с офисом.',
  'admin.orders.emptyFilter': 'Нет заказов с таким статусом.',
  'admin.orders.handOver': 'Передать монтажнику',
  'admin.orders.handingOver': 'Передача...',
  'admin.orders.handedOver': 'У монтажника',
  'admin.orders.installationReport': 'Отчёт о монтаже',
  'admin.orders.completedAt': 'Завершено',
  'admin.orders.installationPhoto': 'Фото с монтажа',
  'admin.orders.handOverError': 'Не удалось передать заказ.',
  'admin.orders.notHandedOver': 'Не передано',

  'admin.orderCards.title': 'Карточки заказов',
  'admin.orderCards.subtitle':
    'Новые заказы ждут данные об установке, прежде чем попасть в очередь производства.',
  'admin.orderCards.loadError': 'Не удалось загрузить карточки заказов.',
  'admin.orderCards.convertError': 'Не удалось преобразовать карточку в заказ.',
  'admin.orderCards.alreadyOrdered':
    'У этой карточки уже есть заказ. Сначала удалите заказ.',
  'admin.orderCards.deleteError': 'Не удалось удалить карточку заказа.',
  'admin.orderCards.deleteConfirm':
    'Удалить эту карточку заказа и её данные? Это действие нельзя отменить.',
  'admin.orderCards.empty': 'Нет карточек заказов.',
  'admin.orderCards.filter.toProcess': 'К обработке',
  'admin.orderCards.filter.converted': 'Преобразованные',
  'admin.orderCards.filter.all': 'Все',
  'admin.orderCards.pendingBadge': '{count} ожидают',
  'admin.orderCards.cardNumber': 'Карточка №',
  'admin.orderCards.clientId': 'ID клиента:',
  'admin.orderCards.unknownUser': 'Неизвестный пользователь',
  'admin.orderCards.convertedBadge': 'Преобразована · №{id}',
  'admin.orderCards.pendingStateBadge': 'Ожидает',
  'admin.orderCards.noDetails': 'Нет данных по этой карточке.',
  'admin.orderCards.dimensions': 'Размеры',
  'admin.orderCards.finish': 'Отделка',
  'admin.orderCards.pricePerM2': 'Цена/м²',
  'admin.orderCards.inscription': 'Надпись',
  'admin.orderCards.photo': 'Фотография от клиента',
  'admin.orderCards.unknownMaterial': 'Неизвестный материал',
  'admin.orderCards.noPrice': 'Цена не указана',
  'admin.orderCards.dueLabel': 'Срок: {date}',
  'admin.orderCards.convertButton': 'Преобразовать в заказ',
  'admin.orderCards.modalTitle': 'Преобразовать в заказ',
  'admin.orderCards.price': 'Цена (BYN)',
  'admin.orderCards.pricePlaceholder': 'например, 4250.00',
  'admin.orderCards.installationAddress': 'Адрес установки',
  'admin.orderCards.installationAddressPlaceholder': 'Улица, город, кладбище...',
  'admin.orderCards.contractDetails': 'Условия договора',
  'admin.orderCards.contractDetailsPlaceholder':
    'Особые договорённости, график оплат, заметки...',
  'admin.orderCards.deadline': 'Срок',
  'admin.orderCards.priceHint':
    'Подсказка по цене из материала и площади. Оставьте пустым, если сумма ещё неизвестна.',
  'admin.orderCards.converting': 'Преобразование...',
  'admin.orderCards.createOrder': 'Создать заказ',
  'admin.orderCards.clientFullName': 'ФИО клиента',
  'admin.orderCards.clientFullNamePlaceholder': 'Иван Иванов',
  'admin.orderCards.passportSeries': 'Серия паспорта',
  'admin.orderCards.passportSeriesPlaceholder': 'AB',
  'admin.orderCards.passportNumber': 'Номер паспорта',
  'admin.orderCards.passportNumberPlaceholder': '1234567',

  'admin.users.title': 'Пользователи',
  'admin.users.subtitle':
    'Назначайте роли монтажника или администратора. Новые пользователи получают роль клиента.',
  'admin.users.loadError': 'Не удалось загрузить пользователей.',
  'admin.users.updateError': 'Не удалось обновить роль.',
  'admin.users.empty': 'Пока нет пользователей.',
  'admin.users.user': 'Пользователь',
  'admin.users.email': 'Эл. почта',
  'admin.users.phone': 'Телефон',
  'admin.users.created': 'Создан',
  'admin.users.role': 'Роль',
  'admin.users.role.klient': 'Клиент',
  'admin.users.role.monter': 'Монтажник',
  'admin.users.role.admin': 'Администратор',

  'admin.messages.title': 'Сообщения',
  'admin.messages.subtitle': 'Входящие сообщения из формы на главной странице.',
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
  'admin.messages.filter.archived': 'В архиве',
  'admin.messages.markRead': 'Отметить как прочитанное',
  'admin.messages.markNew': 'Отметить как новое',
  'admin.messages.archive': 'В архив',
  'admin.messages.delete': 'Удалить',

  'installer.title': 'Карты монтажа',
  'installer.subtitle':
    'Рабочий список только для чтения, созданный из существующих заказов. Этот экран не изменяет данные в базе.',
  'installer.readOnly': 'Только чтение',
  'installer.filter.all': 'Все',
  'installer.offline': 'Нет соединения — список загружен {date}. Может быть неактуальным.',
  'installer.offlineNoSync': 'Нет соединения — список может быть неактуальным.',
  'installer.loadError': 'Не удалось загрузить карты монтажа.',
  'installer.empty': 'Офис пока не передал ни одного заказа.',
  'installer.emptyFilter': 'Ни один заказ не подходит под фильтр.',
  'installer.cardNumber': 'Заказ',
  'installer.unknownClient': 'Клиент не указан',
  'installer.address': 'Адрес монтажа',
  'installer.noAddress': 'Адрес не указан',
  'installer.deadline': 'Срок',
  'installer.noDeadline': 'Дата не назначена',
  'installer.noDetails': 'Нет данных о памятнике.',
  'installer.reportSection': 'Отчёт о монтаже',
  'installer.workStatus': 'Статус работ',
  'installer.workerComments': 'Заметки монтажника',
  'installer.workerCommentsPlaceholder': 'Что сделано, чего не хватает...',
  'installer.photoEvidence': 'Фотоподтверждение',
  'installer.choosePhoto': 'Выбрать фото',
  'installer.uploading': 'Загрузка...',
  'installer.photoHint': 'JPEG, PNG или WebP, до 8 МБ',
  'installer.replacePhoto': 'Заменить фото',
  'installer.completedAt': 'Завершено',
  'installer.save': 'Сохранить отчёт',
  'installer.saving': 'Сохранение...',
  'installer.saved': 'Отчёт сохранён',
  'installer.saveError': 'Не удалось сохранить отчёт.',
  'installer.openPhoto': 'Открыть фото',
  'installer.notReported': 'Отчёта пока нет',
  'myOrders.title': 'Мои заказы',
  'myOrders.subtitle': 'Всё, что вы заказали, начиная с последнего.',
  'myOrders.refresh': 'Обновить',
  'myOrders.loading': 'Загрузка заказов...',
  'myOrders.loadError': 'Не удалось загрузить заказы.',
  'myOrders.empty': 'У вас пока нет заказов.',
  'myOrders.emptyHint': 'Соберите памятник в конструкторе, и заказ появится здесь.',
  'myOrders.emptyCta': 'Открыть конструктор',
  'myOrders.submitted': 'Отправлено:',
  'myOrders.reference': 'Номер',
  'myOrders.noDetails': 'Для этого заказа нет сохранённой конфигурации.',
  'myOrders.unknownMaterial': 'Неизвестный материал',
  'myOrders.configSection': 'Ваша конфигурация',
  'myOrders.orderSection': 'Заказ',
  'myOrders.awaitingReview': 'Мы получили заказ и скоро подтвердим цену и срок.',
  'myOrders.material': 'Материал',
  'myOrders.category': 'Категория',
  'myOrders.dimensions': 'Размеры',
  'myOrders.finish': 'Обработка',
  'myOrders.inscription': 'Надпись',
  'myOrders.price': 'Цена',
  'myOrders.deadline': 'Срок',
  'myOrders.address': 'Адрес монтажа',
  'myOrders.confirmedAt': 'Подтверждено',
  'myOrders.notProvided': 'Пока не согласовано',
  'myOrders.status.awaiting': 'Заказ принят',
  'myOrders.status.pending': 'Сбор информации',
  'myOrders.status.inProgress': 'В работе',
  'myOrders.status.completed': 'Выполнен',
  'myOrders.status.cancelled': 'Отменён',
  'header.myOrders': 'Мои заказы',
  'header.openMenu': 'Открыть меню',
  'header.closeMenu': 'Закрыть меню',
};

export const dictionaries: Record<Language, Dictionary> = { en, pl, ru };

const APP = {
  NAME: 'Database Pingpong Bekasi',
  SPREADSHEET_ID: '1orb-AHN8XN9h2zXAauVC79y9mRlrwVSs023UYIEcY0Q',
  PHOTO_FOLDER_ID: '1Vr75P4XcN50ujQB3VGbotUBRt23oghlv',
  TIME_ZONE: 'Asia/Jakarta',
  SESSION_EXPIRY_HOURS: 24,
  RESET_TOKEN_EXPIRY_MINUTES: 30,
  RESET_RATE_LIMIT_PER_HOUR: 3,
  MAX_LOGIN_FAILURES: 5,
  LOCK_MINUTES: 15,
  MAX_UPLOAD_MB: 5,
  DEFAULT_DIVISIONS: ['Pemula', 'Menengah', 'Mahir', 'Juara 1', 'Juara 2', 'Juara 3'],
  ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  PLAYER_STATUSES: ['Menunggu Verifikasi', 'Perlu Revisi', 'Terverifikasi', 'Ditolak'],
  PTM_STATUSES: ['Menunggu Verifikasi', 'Perlu Revisi', 'Terverifikasi', 'Ditolak'],
  ACTIVE_STATUSES: ['Aktif', 'Nonaktif'],
  CONTENT_STATUSES: ['Draft', 'Published', 'Archived'],
  AD_TYPES: ['PTM', 'Produk', 'Turnamen', 'Jasa', 'Marketplace'],
  PTM_ROLES: ['Tidak tergabung PTM', 'Anggota PTM', 'Ketua PTM', 'Pengurus PTM', 'Pelatih', 'Lainnya'],
  PTM_ACCESS_STATUSES: ['Menunggu Verifikasi', 'Terverifikasi', 'Ditolak'],
  SAFE_RESET_MESSAGE: 'Jika email terdaftar, link reset password akan dikirim ke email tersebut.'
};

const SHEETS = {
  USERS: 'Users',
  SESSIONS: 'Sessions',
  PLAYERS: 'Pemain',
  PTM: 'PTM',
  PTM_ACCESS: 'PTMAccess',
  NEWS: 'Berita',
  ADS: 'Iklan',
  CONFIG: 'Konfigurasi',
  LOG: 'Log'
};

const HEADERS = {
  Users: [
    'Email',
    'Role',
    'StatusUser',
    'PasswordHash',
    'PasswordSalt',
    'AuthProvider',
    'EmailVerified',
    'CreatedAt',
    'LastLoginAt',
    'FailedLoginCount',
    'LockedUntil',
    'ResetTokenHash',
    'ResetTokenExpiresAt',
    'LastPasswordResetAt',
    'MustChangePassword'
  ],
  Sessions: [
    'SessionTokenHash',
    'Email',
    'Role',
    'CreatedAt',
    'ExpiresAt',
    'LastSeenAt',
    'RevokedAt'
  ],
  Pemain: [
    'ID',
    'Email',
    'NamaAsli',
    'NamaPanggilan',
    'FotoURL',
    'FotoFileID',
    'TanggalLahir',
    'NoKTP',
    'Alamat',
    'NoTelepon',
    'NamaPTM',
    'StatusDiPTM',
    'JabatanPTMLainnya',
    'NamaPT',
    'Divisi',
    'Status',
    'StatusProfil',
    'KeteranganPemain',
    'CatatanAdmin',
    'CreatedAt',
    'UpdatedAt',
    'VerifiedAt',
    'VerifiedBy',
    'LastPhotoUpdatedAt',
    'LastPhoneUpdatedAt'
  ],
  PTM: [
    'ID',
    'NamaPTM',
    'NamaKetua',
    'EmailKetua',
    'NoTeleponKetua',
    'NoWhatsAppPTM',
    'AlamatPTM',
    'KecamatanKota',
    'GoogleMapsLink',
    'DeskripsiPTM',
    'SejarahPTM',
    'JadwalLatihan',
    'LogoURL',
    'LogoFileID',
    'FotoKegiatanJSON',
    'Instagram',
    'TikTok',
    'Website',
    'KeteranganPublikPTM',
    'Status',
    'StatusPTM',
    'KeteranganPTM',
    'CatatanAdmin',
    'KeteranganAdminPTM',
    'CreatedBy',
    'CreatedAt',
    'UpdatedBy',
    'UpdatedAt',
    'VerifiedBy',
    'VerifiedAt'
  ],
  PTMAccess: [
    'ID',
    'PTMID',
    'NamaPTM',
    'Email',
    'NamaUser',
    'RolePTM',
    'AccessStatus',
    'RequestedAt',
    'ApprovedBy',
    'ApprovedAt',
    'RejectedBy',
    'RejectedAt',
    'CatatanAdmin'
  ],
  Berita: [
    'ID',
    'Judul',
    'Ringkasan',
    'Isi',
    'FotoURL',
    'FotoFileID',
    'Status',
    'CreatedBy',
    'CreatedAt',
    'UpdatedBy',
    'UpdatedAt'
  ],
  Iklan: [
    'ID',
    'TipeIklan',
    'Judul',
    'Deskripsi',
    'FotoURL',
    'FotoFileID',
    'LinkTujuan',
    'NamaPengiklan',
    'Status',
    'CreatedBy',
    'CreatedAt',
    'UpdatedBy',
    'UpdatedAt'
  ],
  Konfigurasi: ['Key', 'Value'],
  Log: [
    'Timestamp',
    'ActorEmail',
    'TargetEmail',
    'Action',
    'Details',
    'BeforeValue',
    'AfterValue',
    'Result'
  ]
};

const TEXT_COLUMNS = {
  Users: ['Email', 'Role', 'StatusUser', 'PasswordHash', 'PasswordSalt', 'ResetTokenHash'],
  Sessions: ['SessionTokenHash', 'Email', 'Role'],
  Pemain: ['ID', 'Email', 'NoKTP', 'NoTelepon', 'FotoFileID'],
  PTM: ['ID', 'EmailKetua', 'NoTeleponKetua', 'NoWhatsAppPTM', 'LogoFileID'],
  PTMAccess: ['ID', 'PTMID', 'Email', 'RolePTM', 'AccessStatus'],
  Berita: ['ID', 'FotoFileID'],
  Iklan: ['ID', 'FotoFileID', 'LinkTujuan'],
  Konfigurasi: ['Key', 'Value'],
  Log: ['ActorEmail', 'TargetEmail', 'Action', 'Result']
};

function doGet() {
  setupDatabase();
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle(APP.NAME)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function setupDatabase() {
  const ss = getSpreadsheet_();
  Object.keys(HEADERS).forEach(function (name) {
    ensureSheet_(ss, name, HEADERS[name]);
  });

  const defaults = {
    SPREADSHEET_ID: APP.SPREADSHEET_ID,
    FOLDER_FOTO_ID: APP.PHOTO_FOLDER_ID,
    SYSTEM_EMAIL: 'databasepingpongbekasi@gmail.com',
    SYSTEM_SENDER_NAME: APP.NAME,
    REPLY_TO_EMAIL: '',
    ADMIN_EMAIL: '',
    ADMIN_CONTACT_NAME: 'Admin Database Pingpong Bekasi',
    ADMIN_CONTACT_PHONE: '081234567890',
    ADMIN_WHATSAPP: '6281234567890',
    AD_INQUIRY_TEXT: 'Halo Admin Database Pingpong Bekasi, saya ingin bertanya mengenai pemasangan iklan di website.',
    WEB_APP_URL: '',
    DIVISI: APP.DEFAULT_DIVISIONS.join(','),
    MAX_UPLOAD_MB: String(APP.MAX_UPLOAD_MB),
    ALLOWED_FILE_TYPES: APP.ALLOWED_FILE_TYPES.join(','),
    SESSION_EXPIRY_HOURS: String(APP.SESSION_EXPIRY_HOURS),
    RESET_TOKEN_EXPIRY_MINUTES: String(APP.RESET_TOKEN_EXPIRY_MINUTES)
  };

  Object.keys(defaults).forEach(function (key) {
    if (getConfigValueRaw_(key) === '') updateConfigValue_(key, defaults[key]);
  });

  backfillDefaultColumn_(SHEETS.PLAYERS, 'StatusProfil', 'Aktif');
  backfillDefaultColumn_(SHEETS.PTM, 'StatusPTM', 'Aktif');
  backfillPTMPublicNote_();

  return ok_({ message: 'Database v3.0 siap digunakan.', sheets: Object.keys(HEADERS) });
}

function runSelfCheck() {
  const checks = [];
  try {
    setupDatabase();
    const ss = getSpreadsheet_();
    checks.push(check_('Spreadsheet dapat dibuka', !!ss));
    Object.keys(HEADERS).forEach(function (name) {
      const sheet = ss.getSheetByName(name);
      checks.push(check_('Header sheet ' + name + ' tersedia', sheet && sameHeaders_(getHeaders_(sheet), HEADERS[name])));
    });
    checks.push(check_('Folder file final tersedia di konfigurasi', getConfigValue_('FOLDER_FOTO_ID', APP.PHOTO_FOLDER_ID) === APP.PHOTO_FOLDER_ID || !!getConfigValue_('FOLDER_FOTO_ID', '')));
    checks.push(check_('Divisi lebih dari satu', getDivisions_().length > 1));
    checks.push(check_('Password kuat diterima', isValidPassword_('Password1!')));
    checks.push(check_('Masking KTP benar', maskKtp_('3174123456781234') === '3174********1234'));
    checks.push(check_('Safe reset message sesuai PRD', APP.SAFE_RESET_MESSAGE.indexOf('Jika email terdaftar') === 0));
    checks.push(check_('StatusDiPTM Ketua PTM tersedia', APP.PTM_ROLES.indexOf('Ketua PTM') !== -1));
    checks.push(check_('Status Aktif/Nonaktif tersedia', APP.ACTIVE_STATUSES.indexOf('Aktif') !== -1 && APP.ACTIVE_STATUSES.indexOf('Nonaktif') !== -1));
    try {
      DriveApp.getFolderById(getConfigValue_('FOLDER_FOTO_ID', APP.PHOTO_FOLDER_ID)).getName();
      checks.push(check_('Folder Drive dapat dibuka', true));
    } catch (err) {
      checks.push(check_('Folder Drive dapat dibuka', false, err.message));
    }
    return ok_({ passed: checks.every(function (item) { return item.pass; }), checks: checks });
  } catch (err) {
    return fail_(err);
  }
}

function testAccess() {
  const checks = [];
  try {
    const ss = SpreadsheetApp.openById(APP.SPREADSHEET_ID);
    checks.push(check_('SpreadsheetApp.openById(SPREADSHEET_ID)', !!ss, ss ? ss.getName() : ''));
  } catch (err) {
    checks.push(check_('SpreadsheetApp.openById(SPREADSHEET_ID)', false, err.message));
  }
  try {
    const folderId = getConfigValue_('FOLDER_FOTO_ID', APP.PHOTO_FOLDER_ID);
    const folder = DriveApp.getFolderById(folderId);
    checks.push(check_('DriveApp.getFolderById(FOLDER_FOTO_ID)', !!folder, folder ? folder.getName() : ''));
  } catch (err) {
    checks.push(check_('DriveApp.getFolderById(FOLDER_FOTO_ID)', false, err.message));
  }
  try {
    const quota = MailApp.getRemainingDailyQuota();
    checks.push(check_('MailApp.getRemainingDailyQuota()', typeof quota === 'number', String(quota)));
  } catch (err) {
    checks.push(check_('MailApp.getRemainingDailyQuota()', false, err.message));
  }
  return ok_({
    message: 'Jalankan fungsi ini satu kali dari Apps Script editor memakai akun owner/deployer untuk authorize Spreadsheet, Drive, dan MailApp.',
    deployment: 'Deploy Web App final dengan Execute as: Me dan Who has access: Anyone / Anyone with the link.',
    passed: checks.every(function (item) { return item.pass; }),
    checks: checks
  });
}

function seedInitialAdmin(email, temporaryPassword) {
  try {
    setupDatabase();
    email = normalizeEmail_(email);
    validateEmail_(email);
    validatePassword_(temporaryPassword);
    const users = getSheet_(SHEETS.USERS);
    const found = findRowByValue_(users, 'Email', email);
    const salt = newSalt_();
    const now = new Date();
    const record = {
      Email: email,
      Role: 'admin',
      StatusUser: 'active',
      PasswordHash: hashPassword_(temporaryPassword, salt),
      PasswordSalt: salt,
      AuthProvider: 'internal',
      EmailVerified: true,
      CreatedAt: now,
      LastLoginAt: '',
      FailedLoginCount: 0,
      LockedUntil: '',
      ResetTokenHash: '',
      ResetTokenExpiresAt: '',
      LastPasswordResetAt: '',
      MustChangePassword: true
    };
    if (found.rowNumber) {
      updateObject_(users, found.rowNumber, record);
    } else {
      appendObject_(users, record);
    }
    writeLog_(email, email, 'SEED_INITIAL_ADMIN', { email: maskEmail_(email) }, '', { Role: 'admin' }, 'SUCCESS');
    return ok_({ message: 'Admin awal berhasil dibuat.', email: email });
  } catch (err) {
    writeLog_('', normalizeEmail_(email), 'SEED_INITIAL_ADMIN_FAILED', err.message, '', '', 'FAILED');
    return fail_(err);
  }
}

function registerAccount(payload) {
  try {
    setupDatabase();
    payload = payload || {};
    const email = normalizeEmail_(payload.email);
    const password = String(payload.password || '');
    const confirmPassword = String(payload.confirmPassword || '');
    validateEmail_(email);
    validatePassword_(password);
    if (password !== confirmPassword) throw new Error('Konfirmasi password tidak sama.');
    const users = getSheet_(SHEETS.USERS);
    if (findRowByValue_(users, 'Email', email).rowNumber) throw new Error('Email sudah terdaftar.');
    const salt = newSalt_();
    const now = new Date();
    appendObject_(users, {
      Email: email,
      Role: 'member',
      StatusUser: 'active',
      PasswordHash: hashPassword_(password, salt),
      PasswordSalt: salt,
      AuthProvider: 'internal',
      EmailVerified: false,
      CreatedAt: now,
      LastLoginAt: '',
      FailedLoginCount: 0,
      LockedUntil: '',
      ResetTokenHash: '',
      ResetTokenExpiresAt: '',
      LastPasswordResetAt: '',
      MustChangePassword: false
    });
    const token = createSession_(email, 'member');
    writeLog_(email, email, 'REGISTER_ACCOUNT', { email: maskEmail_(email) }, '', '', 'SUCCESS');
    return ok_({ token: token, user: buildCurrentUser_(email), message: 'Akun berhasil dibuat. Silakan lengkapi data pemain.' });
  } catch (err) {
    writeLog_(normalizeEmail_((payload || {}).email), normalizeEmail_((payload || {}).email), 'REGISTER_ACCOUNT_FAILED', err.message, '', '', 'FAILED');
    return fail_(err);
  }
}

function login(payload) {
  try {
    setupDatabase();
    payload = payload || {};
    const email = normalizeEmail_(payload.email);
    const password = String(payload.password || '');
    validateEmail_(email);
    if (!password) throw new Error('Email atau password salah.');
    const users = getSheet_(SHEETS.USERS);
    const found = findRowByValue_(users, 'Email', email);
    if (!found.rowNumber) {
      writeLog_(email, email, 'LOGIN_FAILED', 'Email tidak ditemukan.', '', '', 'FAILED');
      throw new Error('Email atau password salah.');
    }
    const user = found.object;
    if (String(user.StatusUser || '').toLowerCase() === 'suspended') {
      writeLog_(email, email, 'SUSPENDED_USER_ACCESS', 'Login suspended.', '', '', 'FAILED');
      throw new Error('Akun Anda dinonaktifkan. Hubungi admin.');
    }
    if (isLocked_(user.LockedUntil)) {
      writeLog_(email, email, 'ACCOUNT_LOCKED', { lockedUntil: formatDate_(user.LockedUntil) }, '', '', 'FAILED');
      throw new Error('Akun terkunci sementara. Coba lagi nanti.');
    }
    if (!secureCompare_(hashPassword_(password, user.PasswordSalt), String(user.PasswordHash || ''))) {
      registerFailedLogin_(users, found.rowNumber, user);
      writeLog_(email, email, 'LOGIN_FAILED', 'Password salah.', '', '', 'FAILED');
      throw new Error('Email atau password salah.');
    }
    updateObject_(users, found.rowNumber, { LastLoginAt: new Date(), FailedLoginCount: 0, LockedUntil: '' });
    const token = createSession_(email, user.Role || 'member');
    writeLog_(email, email, 'LOGIN_SUCCESS', { role: user.Role || 'member' }, '', '', 'SUCCESS');
    return ok_({ token: token, user: buildCurrentUser_(email), message: 'Login berhasil.' });
  } catch (err) {
    return fail_(err);
  }
}

function loginWithPassword(payload) {
  return login(payload);
}

function logout(sessionToken) {
  try {
    const session = getSession_(sessionToken, false);
    if (session.rowNumber) {
      updateObject_(getSheet_(SHEETS.SESSIONS), session.rowNumber, { RevokedAt: new Date() });
      writeLog_(session.object.Email, session.object.Email, 'LOGOUT', '', '', '', 'SUCCESS');
    }
    return ok_({ message: 'Logout berhasil.' });
  } catch (err) {
    return fail_(err);
  }
}

function getCurrentUser(sessionToken) {
  try {
    const session = validateSession_(sessionToken);
    return ok_({ user: buildCurrentUser_(session.Email) });
  } catch (err) {
    return fail_(err);
  }
}

function refreshSession(sessionToken) {
  try {
    const session = validateSession_(sessionToken);
    const sessions = getSheet_(SHEETS.SESSIONS);
    updateObject_(sessions, session._rowNumber, {
      ExpiresAt: addHours_(new Date(), Number(getConfigValue_('SESSION_EXPIRY_HOURS', APP.SESSION_EXPIRY_HOURS))),
      LastSeenAt: new Date()
    });
    writeLog_(session.Email, session.Email, 'SESSION_REFRESHED', '', '', '', 'SUCCESS');
    return ok_({ user: buildCurrentUser_(session.Email) });
  } catch (err) {
    return fail_(err);
  }
}

function forgotPassword(emailOrPayload) {
  const payload = typeof emailOrPayload === 'string' ? { email: emailOrPayload } : (emailOrPayload || {});
  return requestPasswordReset(payload);
}

function requestPasswordReset(payload) {
  let email = '';
  try {
    setupDatabase();
    payload = payload || {};
    email = normalizeEmail_(payload.email);
    validateEmail_(email);
    const safe = APP.SAFE_RESET_MESSAGE;
    writeLog_(email, email, 'REQUEST_PASSWORD_RESET', { email: maskEmail_(email) }, '', '', 'SUCCESS');
    if (isResetRateLimited_(email)) {
      writeLog_(email, email, 'PASSWORD_RESET_RATE_LIMITED', { email: maskEmail_(email) }, '', '', 'FAILED');
      return ok_({ message: safe });
    }
    const users = getSheet_(SHEETS.USERS);
    const found = findRowByValue_(users, 'Email', email);
    if (!found.rowNumber || String(found.object.StatusUser || '').toLowerCase() === 'suspended') return ok_({ message: safe });
    const token = newToken_();
    const expiresAt = addMinutes_(new Date(), Number(getConfigValue_('RESET_TOKEN_EXPIRY_MINUTES', APP.RESET_TOKEN_EXPIRY_MINUTES)));
    updateObject_(users, found.rowNumber, { ResetTokenHash: hashToken_(token), ResetTokenExpiresAt: expiresAt });
    try {
      sendResetPasswordEmail_(email, token, expiresAt);
      writeLog_(email, email, 'PASSWORD_RESET_EMAIL_SENT', { email: maskEmail_(email), expiresAt: formatDate_(expiresAt) }, '', '', 'SUCCESS');
    } catch (mailErr) {
      writeLog_(email, email, 'PASSWORD_RESET_EMAIL_FAILED', mailErr.message, '', '', 'FAILED');
    }
    return ok_({ message: safe });
  } catch (err) {
    writeLog_(email, email, 'PASSWORD_RESET_EMAIL_FAILED', err.message, '', '', 'FAILED');
    return ok_({ message: APP.SAFE_RESET_MESSAGE });
  }
}

function validateResetToken(token) {
  try {
    setupDatabase();
    const found = findUserByResetToken_(token);
    if (!found) {
      writeLog_('', '', 'RESET_TOKEN_INVALID', '', '', '', 'FAILED');
      return ok_({ valid: false, message: 'Link reset password tidak valid atau sudah kedaluwarsa.' });
    }
    if (isExpired_(found.object.ResetTokenExpiresAt)) {
      writeLog_(found.object.Email, found.object.Email, 'RESET_TOKEN_EXPIRED', { email: maskEmail_(found.object.Email) }, '', '', 'FAILED');
      return ok_({ valid: false, message: 'Link reset password tidak valid atau sudah kedaluwarsa.' });
    }
    return ok_({ valid: true, emailMasked: maskEmail_(found.object.Email) });
  } catch (err) {
    return fail_(err);
  }
}

function resetPassword(payloadOrToken, newPassword, confirmPassword) {
  const payload = typeof payloadOrToken === 'object'
    ? payloadOrToken
    : { token: payloadOrToken, password: newPassword, confirmPassword: confirmPassword || newPassword };
  try {
    setupDatabase();
    const token = String(payload.token || '').trim();
    const password = String(payload.password || '');
    const confirm = String(payload.confirmPassword || '');
    validatePassword_(password);
    if (password !== confirm) throw new Error('Konfirmasi password tidak sama.');
    const found = findUserByResetToken_(token);
    if (!found) {
      writeLog_('', '', 'RESET_TOKEN_INVALID', '', '', '', 'FAILED');
      throw new Error('Link reset password tidak valid atau sudah kedaluwarsa.');
    }
    if (isExpired_(found.object.ResetTokenExpiresAt)) {
      writeLog_(found.object.Email, found.object.Email, 'RESET_TOKEN_EXPIRED', { email: maskEmail_(found.object.Email) }, '', '', 'FAILED');
      throw new Error('Link reset password tidak valid atau sudah kedaluwarsa.');
    }
    const salt = newSalt_();
    updateObject_(getSheet_(SHEETS.USERS), found.rowNumber, {
      PasswordHash: hashPassword_(password, salt),
      PasswordSalt: salt,
      FailedLoginCount: 0,
      LockedUntil: '',
      ResetTokenHash: '',
      ResetTokenExpiresAt: '',
      LastPasswordResetAt: new Date(),
      MustChangePassword: false
    });
    revokeSessionsForEmail_(found.object.Email);
    writeLog_(found.object.Email, found.object.Email, 'RESET_PASSWORD_SUCCESS', { email: maskEmail_(found.object.Email) }, '', '', 'SUCCESS');
    return ok_({ message: 'Password berhasil diubah. Silakan login kembali.' });
  } catch (err) {
    writeLog_('', '', 'RESET_PASSWORD_FAILED', err.message, '', '', 'FAILED');
    return fail_(err);
  }
}

function getPublicConfig() {
  try {
    setupDatabase();
    return ok_({
      appName: APP.NAME,
      divisions: getDivisions_(),
      playerStatuses: APP.PLAYER_STATUSES,
      ptmRoles: APP.PTM_ROLES,
      ptmStatuses: APP.PTM_STATUSES,
      activeStatuses: APP.ACTIVE_STATUSES,
      contentStatuses: APP.CONTENT_STATUSES,
      adTypes: APP.AD_TYPES,
      maxUploadMb: Number(getConfigValue_('MAX_UPLOAD_MB', APP.MAX_UPLOAD_MB)),
      allowedFileTypes: String(getConfigValue_('ALLOWED_FILE_TYPES', APP.ALLOWED_FILE_TYPES.join(','))).split(','),
      webAppUrl: getWebAppUrl_(),
      contact: getAdminContact_()
    });
  } catch (err) {
    return fail_(err);
  }
}

function getPublicHomeData(filters) {
  try {
    setupDatabase();
    return ok_({
      players: getPublicPlayers(filters || {}).players,
      ptm: getPublicPTM({}).ptm,
      news: getPublishedNews().news,
      ads: getPublishedAds().ads,
      marketplace: getMarketplaceItems().items,
      contact: getAdminContact_(),
      divisions: getDivisions_()
    });
  } catch (err) {
    return fail_(err);
  }
}

function getPublicPlayers(filters) {
  filters = filters || {};
  const search = cleanText_(filters.search).toLowerCase();
  const divisi = cleanText_(filters.divisi);
  const namaPTM = cleanText_(filters.namaPTM).toLowerCase();
  const namaPT = cleanText_(filters.namaPT).toLowerCase();
  const players = readObjects_(getSheet_(SHEETS.PLAYERS)).filter(function (player) {
    const haystack = [player.NamaAsli, player.NamaPanggilan, player.Divisi, player.NamaPTM, player.NamaPT].join(' ').toLowerCase();
    return isPublicPlayer_(player) &&
      (!search || haystack.indexOf(search) !== -1) &&
      (!divisi || player.Divisi === divisi) &&
      (!namaPTM || String(player.NamaPTM || '').toLowerCase().indexOf(namaPTM) !== -1) &&
      (!namaPT || String(player.NamaPT || '').toLowerCase().indexOf(namaPT) !== -1);
  }).map(publicPlayer_);
  return { ok: true, players: players };
}

function getPublicPTM(filters) {
  filters = filters || {};
  const search = cleanText_(filters.search).toLowerCase();
  const kecamatan = cleanText_(filters.kecamatanKota).toLowerCase();
  const ptm = readObjects_(getSheet_(SHEETS.PTM)).filter(function (row) {
    const haystack = [row.NamaPTM, row.NamaKetua, row.KecamatanKota].join(' ').toLowerCase();
    return isPublicPTM_(row) &&
      (!search || haystack.indexOf(search) !== -1) &&
      (!kecamatan || String(row.KecamatanKota || '').toLowerCase().indexOf(kecamatan) !== -1);
  }).map(publicPTM_);
  return { ok: true, ptm: ptm };
}

function getPTMDetail(ptmId) {
  try {
    const ptm = getPTMById_(ptmId);
    if (!ptm || !isPublicPTM_(ptm)) throw new Error('PTM tidak ditemukan.');
    return ok_({ ptm: publicPTMDetail_(ptm) });
  } catch (err) {
    return fail_(err);
  }
}

function getPublicPlayerDetail(playerId) {
  try {
    const player = getPlayerById_(playerId);
    if (!player || !isPublicPlayer_(player)) throw new Error('Pemain tidak ditemukan.');
    return ok_({ player: publicPlayer_(player) });
  } catch (err) {
    return fail_(err);
  }
}

function getPublishedNews() {
  return ok_({ news: readObjects_(getSheet_(SHEETS.NEWS)).filter(isPublished_).map(publicNews_) });
}

function getPublicNewsDetail(newsId) {
  try {
    const found = findRowByValue_(getSheet_(SHEETS.NEWS), 'ID', String(newsId || '').trim());
    if (!found.rowNumber || found.object.Status !== 'Published') throw new Error('Berita tidak ditemukan.');
    return ok_({ news: publicNews_(found.object) });
  } catch (err) {
    return fail_(err);
  }
}

function getPublishedAds() {
  const ads = readObjects_(getSheet_(SHEETS.ADS)).filter(function (ad) {
    return ad.Status === 'Published' && ['PTM', 'Turnamen', 'Jasa'].indexOf(String(ad.TipeIklan || '')) !== -1;
  }).map(publicAd_);
  return ok_({ ads: ads });
}

function getPublicAdDetail(adId) {
  try {
    const found = findRowByValue_(getSheet_(SHEETS.ADS), 'ID', String(adId || '').trim());
    if (!found.rowNumber || found.object.Status !== 'Published') throw new Error('Iklan tidak ditemukan.');
    return ok_({ ad: publicAd_(found.object) });
  } catch (err) {
    return fail_(err);
  }
}

function getMarketplaceItems() {
  const items = readObjects_(getSheet_(SHEETS.ADS)).filter(function (ad) {
    return ad.Status === 'Published' && ['Marketplace', 'Produk'].indexOf(String(ad.TipeIklan || '')) !== -1;
  }).map(publicAd_);
  return ok_({ items: items });
}

function completePlayerProfile(sessionToken, payload) {
  try {
    setupDatabase();
    const ctx = requireMember_(sessionToken);
    payload = payload || {};
    if (getPlayerByEmail_(ctx.email)) throw new Error('Data pemain sudah pernah dilengkapi.');
    const record = buildPlayerRecord_(ctx.email, payload, true);
    appendObject_(getSheet_(SHEETS.PLAYERS), record);
    writeLog_(ctx.email, ctx.email, 'COMPLETE_PLAYER_PROFILE', { playerId: record.ID }, '', maskSensitiveObject_(record), 'SUCCESS');
    return ok_({ profile: privatePlayer_(record), user: buildCurrentUser_(ctx.email), message: 'Data pemain berhasil dilengkapi.' });
  } catch (err) {
    writeLog_('', '', 'COMPLETE_PLAYER_PROFILE_FAILED', err.message, '', maskSensitiveObject_(payload || {}), 'FAILED');
    return fail_(err);
  }
}

function registerMember(payload) {
  try {
    const account = registerAccount(payload);
    if (!account.ok) return account;
    return completePlayerProfile(account.token, payload);
  } catch (err) {
    return fail_(err);
  }
}

function getMyProfile(sessionToken) {
  try {
    const ctx = validateSession_(sessionToken);
    const player = getPlayerByEmail_(ctx.Email);
    if (!player) return ok_({ profile: null, user: buildCurrentUser_(ctx.Email), needsProfile: true });
    return ok_({ profile: privatePlayer_(player), user: buildCurrentUser_(ctx.Email) });
  } catch (err) {
    return fail_(err);
  }
}

function updateMyProfile(sessionToken, payload) {
  try {
    const ctx = requireMember_(sessionToken);
    payload = payload || {};
    const players = getSheet_(SHEETS.PLAYERS);
    const found = findRowByValue_(players, 'Email', ctx.email);
    if (!found.rowNumber) throw new Error('Profil pemain belum tersedia.');
    const before = found.object;
    const updates = {};
    if ('namaAsli' in payload) updates.NamaAsli = requiredText_(payload.namaAsli, 'Nama asli');
    if ('namaPanggilan' in payload) updates.NamaPanggilan = cleanText_(payload.namaPanggilan);
    if ('alamat' in payload) updates.Alamat = requiredText_(payload.alamat, 'Alamat');
    if ('noTelepon' in payload) {
      updates.NoTelepon = normalizePhoneText_(payload.noTelepon);
      updates.LastPhoneUpdatedAt = new Date();
    }
    if ('namaPTM' in payload) updates.NamaPTM = cleanText_(payload.namaPTM);
    if ('statusDiPTM' in payload) {
      validatePtmRole_(payload.statusDiPTM, payload.jabatanPTMLainnya);
      updates.StatusDiPTM = cleanText_(payload.statusDiPTM);
      updates.JabatanPTMLainnya = cleanText_(payload.jabatanPTMLainnya);
    }
    if ('namaPT' in payload) updates.NamaPT = cleanText_(payload.namaPT);
    if ('divisi' in payload && cleanText_(payload.divisi) !== String(before.Divisi || '')) {
      if (['Menunggu Verifikasi', 'Perlu Revisi'].indexOf(String(before.Status || '')) === -1) throw new Error('Divisi tidak bisa diubah setelah status Terverifikasi atau Ditolak.');
      validateDivision_(payload.divisi);
      updates.Divisi = cleanText_(payload.divisi);
      writeLog_(ctx.email, ctx.email, 'UPDATE_DIVISI_BY_MEMBER', { from: before.Divisi, to: updates.Divisi }, '', '', 'SUCCESS');
    }
    if (!Object.keys(updates).length) throw new Error('Tidak ada perubahan data.');
    updates.UpdatedAt = new Date();
    updateObject_(players, found.rowNumber, updates);
    const after = Object.assign({}, before, updates);
    writeLog_(ctx.email, ctx.email, 'UPDATE_PROFILE', diffObjects_(before, after), maskSensitiveObject_(before), maskSensitiveObject_(after), 'SUCCESS');
    return ok_({ profile: privatePlayer_(after), user: buildCurrentUser_(ctx.email), message: 'Profil berhasil diperbarui.' });
  } catch (err) {
    writeLog_('', '', 'UPDATE_PROFILE_FAILED', err.message, '', maskSensitiveObject_(payload || {}), 'FAILED');
    return fail_(err);
  }
}

function replaceMyPhoto(sessionToken, filePayload) {
  try {
    const ctx = requireMember_(sessionToken);
    const players = getSheet_(SHEETS.PLAYERS);
    const found = findRowByValue_(players, 'Email', ctx.email);
    if (!found.rowNumber) throw new Error('Profil pemain belum tersedia.');
    const uploaded = uploadFile_(filePayload, found.object.ID, ctx.email, 'PLAYER_PHOTO');
    const updates = { FotoURL: uploaded.url, FotoFileID: uploaded.fileId, LastPhotoUpdatedAt: new Date(), UpdatedAt: new Date() };
    updateObject_(players, found.rowNumber, updates);
    writeLog_(ctx.email, ctx.email, 'UPDATE_PHOTO', { fileId: uploaded.fileId }, { FotoFileID: found.object.FotoFileID }, { FotoFileID: uploaded.fileId }, 'SUCCESS');
    return ok_({ profile: privatePlayer_(Object.assign({}, found.object, updates)), message: 'Foto berhasil diperbarui.' });
  } catch (err) {
    writeLog_('', '', 'UPDATE_PHOTO_FAILED', err.message, '', '', 'FAILED');
    return fail_(err);
  }
}

function getMyVerificationStatus(sessionToken) {
  try {
    const ctx = requireMember_(sessionToken);
    const player = getPlayerByEmail_(ctx.email);
    if (!player) throw new Error('Profil pemain belum tersedia.');
    return ok_({ status: player.Status, divisi: player.Divisi, catatanAdmin: player.CatatanAdmin || '' });
  } catch (err) {
    return fail_(err);
  }
}

function registerPTM(sessionToken, payload) {
  try {
    const ctx = requireMember_(sessionToken);
    const player = getPlayerByEmail_(ctx.email);
    if (!player || player.StatusDiPTM !== 'Ketua PTM') {
      writeLog_(ctx.email, '', 'UNAUTHORIZED_REGISTER_PTM', '', '', '', 'FAILED');
      throw new Error('Hanya Ketua PTM yang dapat mendaftarkan PTM.');
    }
    if (getOwnedPTMByEmail_(ctx.email)) {
      writeLog_(ctx.email, ctx.email, 'PTM_REGISTER_DUPLICATE_BLOCKED', { email: maskEmail_(ctx.email) }, '', '', 'FAILED');
      throw new Error('Ketua PTM hanya boleh mendaftarkan satu PTM. Silakan edit PTM yang sudah ada.');
    }
    payload = payload || {};
    const now = new Date();
    const id = createId_('PTM');
    const logo = uploadFile_(payload.logo, id, ctx.email, 'PTM_LOGO');
    const photos = uploadManyFiles_(payload.fotoKegiatan || [], id, ctx.email, 'PTM_ACTIVITY');
    const record = buildPTMRecord_(id, ctx.email, payload, logo, photos, now, player);
    appendObject_(getSheet_(SHEETS.PTM), record);
    writeLog_(ctx.email, id, 'REGISTER_PTM', { ptmId: id, namaPTM: record.NamaPTM }, '', '', 'SUCCESS');
    return ok_({ ptm: privatePTM_(record), message: 'PTM berhasil didaftarkan dan menunggu verifikasi.' });
  } catch (err) {
    writeLog_('', '', 'REGISTER_PTM_FAILED', err.message, '', '', 'FAILED');
    return fail_(err);
  }
}

function getMyPTM(sessionToken) {
  try {
    const ctx = requireMember_(sessionToken);
    const player = getPlayerByEmail_(ctx.email);
    const accessRows = readObjects_(getSheet_(SHEETS.PTM_ACCESS)).filter(function (row) {
      return normalizeEmail_(row.Email) === ctx.email;
    });
    const accessByPTM = {};
    accessRows.forEach(function (row) { accessByPTM[String(row.PTMID || '')] = row; });
    const ptm = readObjects_(getSheet_(SHEETS.PTM)).filter(function (row) {
      const owned = normalizeEmail_(row.CreatedBy) === ctx.email || normalizeEmail_(row.EmailKetua) === ctx.email;
      const hasAccessRecord = !!accessByPTM[String(row.ID || '')];
      const sameNamedPengurus = player && player.StatusDiPTM === 'Pengurus PTM' && samePTMName_(player.NamaPTM, row.NamaPTM);
      return owned || hasAccessRecord || sameNamedPengurus;
    }).map(function (row) {
      return decoratePTMForUser_(row, ctx, player, accessByPTM[String(row.ID || '')]);
    });
    return ok_({ ptm: ptm });
  } catch (err) {
    return fail_(err);
  }
}

function updateMyPTM(sessionToken, ptmId, payload) {
  try {
    const ctx = requireMember_(sessionToken);
    const sheet = getSheet_(SHEETS.PTM);
    const found = findRowByValue_(sheet, 'ID', ptmId);
    if (!found.rowNumber) throw new Error('PTM tidak ditemukan.');
    if (!canEditPTM_(ctx, ptmId, found.object)) throw new Error('Anda tidak berhak mengedit PTM ini.');
    payload = payload || {};
    const updates = buildPTMUpdates_(payload, found.object);
    if (payload.logo && payload.logo.base64) {
      const logo = uploadFile_(payload.logo, ptmId, ctx.email, 'PTM_LOGO');
      updates.LogoURL = logo.url;
      updates.LogoFileID = logo.fileId;
    }
    if (Array.isArray(payload.fotoKegiatan) && payload.fotoKegiatan.some(function (file) { return file && file.base64; })) {
      const existingPhotos = parseJson_(found.object.FotoKegiatanJSON, []);
      const photos = uploadManyFiles_(payload.fotoKegiatan || [], ptmId, ctx.email, 'PTM_ACTIVITY');
      updates.FotoKegiatanJSON = JSON.stringify(existingPhotos.concat(photos));
    }
    if (!Object.keys(updates).length) throw new Error('Tidak ada perubahan data PTM.');
    updates.UpdatedBy = ctx.email;
    updates.UpdatedAt = new Date();
    if (found.object.Status === 'Terverifikasi') {
      updates.Status = 'Menunggu Verifikasi';
      updates.VerifiedBy = '';
      updates.VerifiedAt = '';
    }
    updateObject_(sheet, found.rowNumber, updates);
    const after = Object.assign({}, found.object, updates);
    writeLog_(ctx.email, ptmId, 'UPDATE_PTM', diffObjects_(found.object, after), maskSensitiveObject_(found.object), maskSensitiveObject_(after), 'SUCCESS');
    return ok_({ ptm: privatePTM_(after), message: 'PTM berhasil diperbarui.' });
  } catch (err) {
    return fail_(err);
  }
}

function uploadPTMLogo(sessionToken, filePayload) {
  try {
    const ctx = requireMember_(sessionToken);
    const uploaded = uploadFile_(filePayload, 'PTM', ctx.email, 'PTM_LOGO');
    return ok_(uploaded);
  } catch (err) {
    return fail_(err);
  }
}

function uploadPTMActivityPhotos(sessionToken, ptmId, filesPayload) {
  try {
    const ctx = requireMember_(sessionToken);
    const ptm = getPTMById_(ptmId);
    if (!ptm || !canEditPTM_(ctx, ptmId, ptm)) throw new Error('Anda tidak berhak mengupload foto PTM ini.');
    return ok_({ files: uploadManyFiles_(filesPayload || [], ptmId, ctx.email, 'PTM_ACTIVITY') });
  } catch (err) {
    return fail_(err);
  }
}

function canEditPTM(sessionToken, ptmId) {
  try {
    const ctx = requireMember_(sessionToken);
    return ok_({ canEdit: canEditPTM_(ctx, ptmId) });
  } catch (err) {
    return fail_(err);
  }
}

function requestPTMEditAccess(sessionToken, ptmId) {
  try {
    const ctx = requireMember_(sessionToken);
    const player = getPlayerByEmail_(ctx.email);
    const ptm = getPTMById_(ptmId);
    if (!player) throw new Error('Profil pemain belum tersedia.');
    if (!ptm) throw new Error('PTM tidak ditemukan.');
    if (player.StatusDiPTM !== 'Pengurus PTM' && player.StatusDiPTM !== 'Ketua PTM') throw new Error('Hanya Ketua PTM atau Pengurus PTM yang dapat mengajukan akses edit.');
    if (!samePTMName_(player.NamaPTM, ptm.NamaPTM)) throw new Error('Nama PTM pada profil Anda tidak cocok dengan PTM ini.');
    if (canEditPTM_(ctx, ptmId, ptm)) return ok_({ message: 'Anda sudah memiliki akses edit PTM ini.', accessStatus: 'Terverifikasi' });

    const sheet = getSheet_(SHEETS.PTM_ACCESS);
    const existing = findPTMAccess_(ptmId, ctx.email);
    const now = new Date();
    const record = {
      ID: existing.object ? existing.object.ID : createId_('ACCESS'),
      PTMID: ptmId,
      NamaPTM: ptm.NamaPTM,
      Email: ctx.email,
      NamaUser: player.NamaAsli,
      RolePTM: player.StatusDiPTM,
      AccessStatus: 'Menunggu Verifikasi',
      RequestedAt: now,
      ApprovedBy: '',
      ApprovedAt: '',
      RejectedBy: '',
      RejectedAt: '',
      CatatanAdmin: ''
    };
    if (existing.rowNumber) updateObject_(sheet, existing.rowNumber, record);
    else appendObject_(sheet, record);
    writeLog_(ctx.email, ptmId, 'REQUEST_PTM_EDIT_ACCESS', { rolePTM: record.RolePTM }, '', '', 'SUCCESS');
    return ok_({ message: 'Permintaan akses edit PTM dikirim dan menunggu verifikasi admin.', access: publicPTMAccess_(record) });
  } catch (err) {
    writeLog_('', ptmId, 'REQUEST_PTM_EDIT_ACCESS_FAILED', err.message, '', '', 'FAILED');
    return fail_(err);
  }
}

function adminGetAllPlayers(sessionToken, filters) {
  try {
    requireAdmin_(sessionToken, 'adminGetAllPlayers');
    filters = filters || {};
    const search = cleanText_(filters.search).toLowerCase();
    const divisi = cleanText_(filters.divisi);
    const status = cleanText_(filters.status);
    const players = readObjects_(getSheet_(SHEETS.PLAYERS)).filter(function (row) {
      const haystack = [row.ID, row.Email, row.NamaAsli, row.NamaPanggilan, row.NoTelepon, row.NamaPTM, row.StatusDiPTM, row.NamaPT, row.Divisi, row.Status, row.StatusProfil, row.KeteranganPemain].join(' ').toLowerCase();
      return (!search || haystack.indexOf(search) !== -1) && (!divisi || row.Divisi === divisi) && (!status || row.Status === status);
    }).map(adminPlayer_);
    return ok_({ players: players });
  } catch (err) {
    return fail_(err);
  }
}

function adminGetPlayerDetail(sessionToken, playerId) {
  try {
    requireAdmin_(sessionToken, 'adminGetPlayerDetail');
    const player = getPlayerById_(playerId);
    if (!player) throw new Error('Pemain tidak ditemukan.');
    return ok_({ player: adminPlayer_(player) });
  } catch (err) {
    return fail_(err);
  }
}

function adminUpdatePlayerVerification(sessionToken, playerId, payload) {
  try {
    const admin = requireAdmin_(sessionToken, 'adminUpdatePlayerVerification');
    payload = payload || {};
    const sheet = getSheet_(SHEETS.PLAYERS);
    const found = findRowByValue_(sheet, 'ID', playerId);
    if (!found.rowNumber) throw new Error('Pemain tidak ditemukan.');
    const updates = {};
    if ('divisi' in payload) {
      validateDivision_(payload.divisi);
      updates.Divisi = cleanText_(payload.divisi);
    }
    if ('status' in payload) {
      validateStatus_(payload.status, APP.PLAYER_STATUSES, 'Status pemain');
      updates.Status = cleanText_(payload.status);
      if (updates.Status === 'Terverifikasi') {
        updates.VerifiedAt = new Date();
        updates.VerifiedBy = admin.email;
      }
    }
    if ('catatanAdmin' in payload) updates.CatatanAdmin = cleanText_(payload.catatanAdmin);
    if ('statusProfil' in payload) {
      validateActiveStatus_(payload.statusProfil, 'StatusProfil');
      updates.StatusProfil = cleanText_(payload.statusProfil);
    }
    if ('keteranganPemain' in payload) updates.KeteranganPemain = cleanText_(payload.keteranganPemain);
    if (!Object.keys(updates).length) throw new Error('Tidak ada perubahan verifikasi.');
    updates.UpdatedAt = new Date();
    updateObject_(sheet, found.rowNumber, updates);
    const after = Object.assign({}, found.object, updates);
    writeLog_(admin.email, found.object.Email, playerActionForStatus_(updates.Status, 'ADMIN_UPDATE_STATUS'), diffObjects_(found.object, after), maskSensitiveObject_(found.object), maskSensitiveObject_(after), 'SUCCESS');
    if ('StatusProfil' in updates && String(found.object.StatusProfil || 'Aktif') !== updates.StatusProfil) {
      writeLog_(admin.email, found.object.Email, 'ADMIN_UPDATE_PLAYER_PROFILE_STATUS', { from: normalizeActiveStatus_(found.object.StatusProfil), to: updates.StatusProfil }, '', '', 'SUCCESS');
    }
    if ('KeteranganPemain' in updates && String(found.object.KeteranganPemain || '') !== updates.KeteranganPemain) {
      writeLog_(admin.email, found.object.Email, 'ADMIN_UPDATE_PLAYER_KETERANGAN', { from: found.object.KeteranganPemain || '', to: updates.KeteranganPemain }, '', '', 'SUCCESS');
    }
    return ok_({ player: adminPlayer_(after), message: 'Verifikasi pemain berhasil diperbarui.' });
  } catch (err) {
    return fail_(err);
  }
}

function adminGetAllPTM(sessionToken, filters) {
  try {
    requireAdmin_(sessionToken, 'adminGetAllPTM');
    filters = filters || {};
    const search = cleanText_(filters.search).toLowerCase();
    const status = cleanText_(filters.status);
    const ptm = readObjects_(getSheet_(SHEETS.PTM)).filter(function (row) {
      const haystack = [row.ID, row.NamaPTM, row.NamaKetua, row.EmailKetua, row.KecamatanKota, row.Status, row.StatusPTM, row.KeteranganPublikPTM, row.KeteranganPTM, row.KeteranganAdminPTM].join(' ').toLowerCase();
      return (!search || haystack.indexOf(search) !== -1) && (!status || row.Status === status);
    }).map(privatePTM_);
    return ok_({ ptm: ptm });
  } catch (err) {
    return fail_(err);
  }
}

function adminGetPTMDetail(sessionToken, ptmId) {
  try {
    requireAdmin_(sessionToken, 'adminGetPTMDetail');
    const ptm = getPTMById_(ptmId);
    if (!ptm) throw new Error('PTM tidak ditemukan.');
    return ok_({ ptm: privatePTM_(ptm) });
  } catch (err) {
    return fail_(err);
  }
}

function adminGetPTMAccessRequests(sessionToken, filters) {
  try {
    requireAdmin_(sessionToken, 'adminGetPTMAccessRequests');
    filters = filters || {};
    const status = cleanText_(filters.status);
    const search = cleanText_(filters.search).toLowerCase();
    const rows = readObjects_(getSheet_(SHEETS.PTM_ACCESS)).filter(function (row) {
      const haystack = [row.ID, row.PTMID, row.NamaPTM, row.Email, row.NamaUser, row.RolePTM, row.AccessStatus].join(' ').toLowerCase();
      return (!status || row.AccessStatus === status) && (!search || haystack.indexOf(search) !== -1);
    }).map(publicPTMAccess_);
    return ok_({ access: rows });
  } catch (err) {
    return fail_(err);
  }
}

function adminUpdatePTMAccess(sessionToken, accessId, actionOrPayload, catatanAdmin) {
  try {
    const admin = requireAdmin_(sessionToken, 'adminUpdatePTMAccess');
    const payload = typeof actionOrPayload === 'object'
      ? (actionOrPayload || {})
      : { action: actionOrPayload, catatanAdmin: catatanAdmin };
    const action = cleanText_(payload.action).toLowerCase();
    if (['approve', 'reject'].indexOf(action) === -1) throw new Error('Action akses PTM tidak valid.');
    const sheet = getSheet_(SHEETS.PTM_ACCESS);
    const found = findRowByValue_(sheet, 'ID', accessId);
    if (!found.rowNumber) throw new Error('Request akses PTM tidak ditemukan.');
    const now = new Date();
    const updates = {
      AccessStatus: action === 'approve' ? 'Terverifikasi' : 'Ditolak',
      CatatanAdmin: cleanText_(payload.catatanAdmin)
    };
    if (action === 'approve') {
      updates.ApprovedBy = admin.email;
      updates.ApprovedAt = now;
      updates.RejectedBy = '';
      updates.RejectedAt = '';
    } else {
      updates.RejectedBy = admin.email;
      updates.RejectedAt = now;
      updates.ApprovedBy = '';
      updates.ApprovedAt = '';
    }
    updateObject_(sheet, found.rowNumber, updates);
    const after = Object.assign({}, found.object, updates);
    writeLog_(admin.email, found.object.PTMID, action === 'approve' ? 'ADMIN_APPROVE_PTM_ACCESS' : 'ADMIN_REJECT_PTM_ACCESS', { accessId: accessId, email: maskEmail_(found.object.Email) }, found.object, after, 'SUCCESS');
    return ok_({ access: publicPTMAccess_(after), message: action === 'approve' ? 'Akses pengurus PTM disetujui.' : 'Akses pengurus PTM ditolak.' });
  } catch (err) {
    return fail_(err);
  }
}

function adminUpdatePTMStatus(sessionToken, ptmId, statusOrPayload, catatanAdmin) {
  try {
    const admin = requireAdmin_(sessionToken, 'adminUpdatePTMStatus');
    const payload = typeof statusOrPayload === 'object'
      ? (statusOrPayload || {})
      : { status: statusOrPayload, catatanAdmin: catatanAdmin };
    const status = cleanText_(payload.status);
    validateStatus_(status, APP.PTM_STATUSES, 'Status PTM');
    const sheet = getSheet_(SHEETS.PTM);
    const found = findRowByValue_(sheet, 'ID', ptmId);
    if (!found.rowNumber) throw new Error('PTM tidak ditemukan.');
    const updates = {
      Status: status,
      CatatanAdmin: cleanText_(payload.catatanAdmin),
      UpdatedBy: admin.email,
      UpdatedAt: new Date(),
      VerifiedBy: status === 'Terverifikasi' ? admin.email : found.object.VerifiedBy,
      VerifiedAt: status === 'Terverifikasi' ? new Date() : found.object.VerifiedAt
    };
    if ('statusPTM' in payload) {
      validateActiveStatus_(payload.statusPTM, 'StatusPTM');
      updates.StatusPTM = cleanText_(payload.statusPTM);
    }
    if ('keteranganPublikPTM' in payload || 'keteranganPTM' in payload) {
      const publicNote = cleanText_(payload.keteranganPublikPTM || payload.keteranganPTM);
      updates.KeteranganPublikPTM = publicNote;
      updates.KeteranganPTM = publicNote;
    }
    if ('keteranganAdminPTM' in payload) updates.KeteranganAdminPTM = cleanText_(payload.keteranganAdminPTM);
    updateObject_(sheet, found.rowNumber, updates);
    const action = status === 'Terverifikasi' ? 'ADMIN_VERIFY_PTM' : status === 'Ditolak' ? 'ADMIN_REJECT_PTM' : status === 'Perlu Revisi' ? 'ADMIN_REQUEST_PTM_REVISION' : 'ADMIN_UPDATE_PTM_STATUS';
    const after = Object.assign({}, found.object, updates);
    writeLog_(admin.email, ptmId, action, updates, maskSensitiveObject_(found.object), maskSensitiveObject_(after), 'SUCCESS');
    if ('StatusPTM' in updates && normalizeActiveStatus_(found.object.StatusPTM) !== updates.StatusPTM) {
      writeLog_(admin.email, ptmId, 'ADMIN_UPDATE_PTM_STATUS_PROFIL', { from: normalizeActiveStatus_(found.object.StatusPTM), to: updates.StatusPTM }, '', '', 'SUCCESS');
    }
    if ('KeteranganPublikPTM' in updates && getPTMPublicNote_(found.object) !== updates.KeteranganPublikPTM) {
      writeLog_(admin.email, ptmId, 'ADMIN_UPDATE_PTM_KETERANGAN', { from: getPTMPublicNote_(found.object), to: updates.KeteranganPublikPTM }, '', '', 'SUCCESS');
    }
    if ('KeteranganAdminPTM' in updates && String(found.object.KeteranganAdminPTM || '') !== updates.KeteranganAdminPTM) {
      writeLog_(admin.email, ptmId, 'ADMIN_UPDATE_PTM_KETERANGAN_ADMIN', { from: found.object.KeteranganAdminPTM || '', to: updates.KeteranganAdminPTM }, '', '', 'SUCCESS');
    }
    return ok_({ ptm: privatePTM_(after), message: 'Status PTM berhasil diperbarui.' });
  } catch (err) {
    return fail_(err);
  }
}

function adminVerifyPTM(sessionToken, ptmId) {
  return adminUpdatePTMStatus(sessionToken, ptmId, 'Terverifikasi', '');
}

function adminRejectPTM(sessionToken, ptmId, catatanAdmin) {
  return adminUpdatePTMStatus(sessionToken, ptmId, 'Ditolak', catatanAdmin);
}

function adminCreateNews(sessionToken, payload) {
  return adminSaveContent_(sessionToken, SHEETS.NEWS, null, payload, 'CREATE_NEWS');
}

function adminUpdateNews(sessionToken, newsId, payload) {
  return adminSaveContent_(sessionToken, SHEETS.NEWS, newsId, payload, 'UPDATE_NEWS');
}

function adminPublishNews(sessionToken, newsId) {
  return adminSetContentStatus_(sessionToken, SHEETS.NEWS, newsId, 'Published', 'PUBLISH_NEWS');
}

function adminArchiveNews(sessionToken, newsId) {
  return adminSetContentStatus_(sessionToken, SHEETS.NEWS, newsId, 'Archived', 'ARCHIVE_NEWS');
}

function adminDeleteNews(sessionToken, newsId) {
  return adminDeleteContent_(sessionToken, SHEETS.NEWS, newsId, 'DELETE_NEWS');
}

function adminCreateAd(sessionToken, payload) {
  return adminSaveContent_(sessionToken, SHEETS.ADS, null, payload, 'CREATE_AD');
}

function adminUpdateAd(sessionToken, adId, payload) {
  return adminSaveContent_(sessionToken, SHEETS.ADS, adId, payload, 'UPDATE_AD');
}

function adminPublishAd(sessionToken, adId) {
  return adminSetContentStatus_(sessionToken, SHEETS.ADS, adId, 'Published', 'PUBLISH_AD');
}

function adminArchiveAd(sessionToken, adId) {
  return adminSetContentStatus_(sessionToken, SHEETS.ADS, adId, 'Archived', 'ARCHIVE_AD');
}

function adminDeleteAd(sessionToken, adId) {
  return adminDeleteContent_(sessionToken, SHEETS.ADS, adId, 'DELETE_AD');
}

function adminGetSettings(sessionToken) {
  try {
    requireAdmin_(sessionToken, 'adminGetSettings');
    return ok_({
      config: getConfigMap_(),
      divisions: getDivisions_(),
      users: readObjects_(getSheet_(SHEETS.USERS)).map(publicUser_)
    });
  } catch (err) {
    return fail_(err);
  }
}

function adminUpdateConfig(sessionToken, key, value) {
  try {
    const admin = requireAdmin_(sessionToken, 'adminUpdateConfig');
    key = String(key || '').trim();
    if (!key) throw new Error('Key konfigurasi wajib diisi.');
    value = String(value || '').trim();
    if (key === 'WEB_APP_URL' && value && !isValidWebAppUrl_(value)) {
      throw new Error('WEB_APP_URL harus memakai URL Web App deployment /exec dari Deploy > Manage deployments, bukan /dev, /edit, /macros/d, preview, atau Google Drive.');
    }
    updateConfigValue_(key, value);
    writeLog_(admin.email, '', 'ADMIN_UPDATE_CONFIG', { key: key }, '', { value: value }, 'SUCCESS');
    return ok_({ message: 'Konfigurasi berhasil disimpan.', config: getConfigMap_() });
  } catch (err) {
    return fail_(err);
  }
}

function adminUpdateDivisions(sessionToken, divisions) {
  try {
    const admin = requireAdmin_(sessionToken, 'adminUpdateDivisions');
    let list = Array.isArray(divisions) ? divisions : String(divisions || '').split(',');
    list = list.map(cleanText_).filter(Boolean);
    if (!list.length) throw new Error('Daftar divisi tidak boleh kosong.');
    if (list.length === 1 && /^\d+$/.test(list[0])) throw new Error('Divisi tidak boleh hanya angka tunggal.');
    updateConfigValue_('DIVISI', list.join(','));
    writeLog_(admin.email, '', 'ADMIN_UPDATE_DIVISI_CONFIG', { divisions: list }, '', '', 'SUCCESS');
    return ok_({ divisions: list, message: 'Divisi berhasil diperbarui.' });
  } catch (err) {
    return fail_(err);
  }
}

function adminGetLogs(sessionToken, filters) {
  try {
    requireAdmin_(sessionToken, 'adminGetLogs');
    filters = filters || {};
    const email = normalizeEmail_(filters.email || '');
    const action = cleanText_(filters.action).toLowerCase();
    const result = cleanText_(filters.result).toLowerCase();
    const date = cleanText_(filters.date);
    const logs = readObjects_(getSheet_(SHEETS.LOG)).filter(function (log) {
      const logDate = log.Timestamp ? Utilities.formatDate(new Date(log.Timestamp), APP.TIME_ZONE, 'yyyy-MM-dd') : '';
      return (!email || normalizeEmail_(log.ActorEmail) === email || normalizeEmail_(log.TargetEmail) === email) &&
        (!action || String(log.Action || '').toLowerCase().indexOf(action) !== -1) &&
        (!result || String(log.Result || '').toLowerCase() === result) &&
        (!date || logDate === date);
    }).reverse().slice(0, 500).map(publicLog_);
    return ok_({ logs: logs });
  } catch (err) {
    return fail_(err);
  }
}

function adminUpdateUserStatus(sessionToken, email, status) {
  try {
    const admin = requireAdmin_(sessionToken, 'adminUpdateUserStatus');
    email = normalizeEmail_(email);
    validateStatus_(status, ['active', 'suspended'], 'Status user');
    if (email === admin.email && status === 'suspended') throw new Error('Tidak bisa menonaktifkan akun sendiri.');
    const users = getSheet_(SHEETS.USERS);
    const found = findRowByValue_(users, 'Email', email);
    if (!found.rowNumber) throw new Error('User tidak ditemukan.');
    updateObject_(users, found.rowNumber, { StatusUser: status });
    if (status === 'suspended') revokeSessionsForEmail_(email);
    writeLog_(admin.email, email, 'ADMIN_UPDATE_USER_STATUS', { status: status }, found.object, { Email: email, StatusUser: status }, 'SUCCESS');
    return ok_({ message: 'Status user berhasil diperbarui.' });
  } catch (err) {
    return fail_(err);
  }
}

function adminUpdateUserRole(sessionToken, email, role) {
  try {
    const admin = requireAdmin_(sessionToken, 'adminUpdateUserRole');
    email = normalizeEmail_(email);
    validateStatus_(role, ['admin', 'member'], 'Role user');
    if (email === admin.email && role !== 'admin') throw new Error('Tidak bisa menurunkan role akun sendiri.');
    const users = getSheet_(SHEETS.USERS);
    const found = findRowByValue_(users, 'Email', email);
    if (!found.rowNumber) throw new Error('User tidak ditemukan.');
    updateObject_(users, found.rowNumber, { Role: role });
    writeLog_(admin.email, email, 'ADMIN_UPDATE_USER_ROLE', { role: role }, found.object, { Email: email, Role: role }, 'SUCCESS');
    return ok_({ message: 'Role user berhasil diperbarui.' });
  } catch (err) {
    return fail_(err);
  }
}

function getAdminDashboard(sessionToken) {
  try {
    requireAdmin_(sessionToken, 'getAdminDashboard');
    const players = readObjects_(getSheet_(SHEETS.PLAYERS));
    const ptm = readObjects_(getSheet_(SHEETS.PTM));
    const news = readObjects_(getSheet_(SHEETS.NEWS));
    const ads = readObjects_(getSheet_(SHEETS.ADS));
    return ok_({
      totals: {
        players: players.length,
        verifiedPlayers: players.filter(function (p) { return p.Status === 'Terverifikasi'; }).length,
        verifiedPTM: ptm.filter(function (p) { return p.Status === 'Terverifikasi'; }).length,
        publishedNews: news.filter(isPublished_).length,
        activeAds: ads.filter(function (a) { return a.Status === 'Published' && a.TipeIklan !== 'Marketplace'; }).length,
        marketplace: ads.filter(function (a) { return a.Status === 'Published' && ['Marketplace', 'Produk'].indexOf(String(a.TipeIklan || '')) !== -1; }).length
      },
      players: adminGetAllPlayers(sessionToken, {}).players || [],
      ptm: adminGetAllPTM(sessionToken, {}).ptm || [],
      ptmAccess: adminGetPTMAccessRequests(sessionToken, {}).access || [],
      news: news.map(privateContent_),
      ads: ads.map(privateContent_),
      recentLogs: adminGetLogs(sessionToken, {}).logs.slice(0, 8),
      divisions: getDivisions_(),
      statuses: APP.PLAYER_STATUSES,
      ptmStatuses: APP.PTM_STATUSES
    });
  } catch (err) {
    return fail_(err);
  }
}

function getAllPlayers(sessionToken, filters) {
  return adminGetAllPlayers(sessionToken, filters);
}

function getPlayerDetail(sessionToken, playerId) {
  return adminGetPlayerDetail(sessionToken, playerId);
}

function updatePlayerVerification(sessionToken, playerId, payload) {
  return adminUpdatePlayerVerification(sessionToken, playerId, payload);
}

function getActivityLogs(sessionToken, filters) {
  return adminGetLogs(sessionToken, filters);
}

function getAdminSettings(sessionToken) {
  return adminGetSettings(sessionToken);
}

function updateDivisions(sessionToken, divisions) {
  return adminUpdateDivisions(sessionToken, divisions);
}

function updateAdminEmail(sessionToken, email) {
  return adminUpdateConfig(sessionToken, 'ADMIN_EMAIL', email);
}

function updateAdminUsers(sessionToken, payload) {
  payload = payload || {};
  if (payload.action === 'suspend') return adminUpdateUserStatus(sessionToken, payload.email, 'suspended');
  if (payload.action === 'activate') return adminUpdateUserStatus(sessionToken, payload.email, 'active');
  if (payload.action === 'promoteAdmin') return adminUpdateUserRole(sessionToken, payload.email, 'admin');
  if (payload.action === 'makeMember') return adminUpdateUserRole(sessionToken, payload.email, 'member');
  return fail_(new Error('Action user tidak valid.'));
}

function requireMember_(sessionToken) {
  const session = validateSession_(sessionToken);
  if (session.Role !== 'member' && session.Role !== 'admin') throw new Error('Akses member ditolak.');
  return { email: session.Email, role: session.Role };
}

function requireAdmin_(sessionToken, functionName) {
  const session = validateSession_(sessionToken);
  if (session.Role !== 'admin') {
    writeLog_(session.Email, '', 'UNAUTHORIZED_ACCESS', { FunctionName: functionName }, '', '', 'FAILED');
    notifyAdmin_('Unauthorized Access - ' + APP.NAME, 'Unauthorized access oleh ' + session.Email + ' pada fungsi ' + functionName + '.');
    throw new Error('Akses admin ditolak.');
  }
  return { email: session.Email, role: session.Role };
}

function validateSession_(sessionToken) {
  const session = getSession_(sessionToken, true);
  const user = getUserByEmail_(session.object.Email);
  if (!user) {
    writeLog_('', '', 'INVALID_SESSION', 'User tidak ditemukan.', '', '', 'FAILED');
    throw new Error('Sesi tidak valid.');
  }
  if (user.StatusUser !== 'active') {
    writeLog_(user.Email, user.Email, 'SUSPENDED_USER_ACCESS', '', '', '', 'FAILED');
    throw new Error('Akun Anda dinonaktifkan. Hubungi admin.');
  }
  session.object._rowNumber = session.rowNumber;
  session.object.Role = user.Role || session.object.Role;
  updateObject_(getSheet_(SHEETS.SESSIONS), session.rowNumber, { LastSeenAt: new Date(), Role: session.object.Role });
  return session.object;
}

function getSession_(sessionToken, required) {
  const token = String(sessionToken || '').trim();
  if (!token) {
    if (required) throw new Error('Sesi tidak tersedia. Silakan login.');
    return { rowNumber: 0, object: null };
  }
  const sheet = getSheet_(SHEETS.SESSIONS);
  const hash = hashToken_(token);
  let found = findRowByValue_(sheet, 'SessionTokenHash', hash);
  if (!found.rowNumber) found = findRowByValue_(sheet, 'TokenHash', hash);
  if (!found.rowNumber) {
    if (required) {
      writeLog_('', '', 'INVALID_SESSION', '', '', '', 'FAILED');
      throw new Error('Sesi tidak valid. Silakan login ulang.');
    }
    return found;
  }
  if (found.object.RevokedAt) throw new Error('Sesi sudah logout. Silakan login ulang.');
  if (isExpired_(found.object.ExpiresAt)) {
    updateObject_(sheet, found.rowNumber, { RevokedAt: new Date() });
    writeLog_(found.object.Email, found.object.Email, 'SESSION_EXPIRED', '', '', '', 'FAILED');
    throw new Error('Sesi kedaluwarsa. Silakan login ulang.');
  }
  return found;
}

function createSession_(email, role) {
  const token = newToken_();
  const now = new Date();
  appendObject_(getSheet_(SHEETS.SESSIONS), {
    SessionTokenHash: hashToken_(token),
    Email: email,
    Role: role,
    CreatedAt: now,
    ExpiresAt: addHours_(now, Number(getConfigValue_('SESSION_EXPIRY_HOURS', APP.SESSION_EXPIRY_HOURS))),
    LastSeenAt: now,
    RevokedAt: ''
  });
  writeLog_(email, email, 'SESSION_CREATED', { role: role }, '', '', 'SUCCESS');
  return token;
}

function revokeSessionsForEmail_(email) {
  const sheet = getSheet_(SHEETS.SESSIONS);
  readObjects_(sheet).forEach(function (session, idx) {
    if (normalizeEmail_(session.Email) === normalizeEmail_(email) && !session.RevokedAt) {
      updateObject_(sheet, idx + 2, { RevokedAt: new Date() });
      writeLog_(email, email, 'SESSION_REVOKED', '', '', '', 'SUCCESS');
    }
  });
}

function buildCurrentUser_(email) {
  const user = getUserByEmail_(email);
  if (!user) throw new Error('User tidak ditemukan.');
  const player = getPlayerByEmail_(email);
  return {
    email: user.Email,
    role: user.Role,
    statusUser: user.StatusUser,
    mustChangePassword: truthy_(user.MustChangePassword),
    needsProfile: user.Role === 'member' && !player,
    playerId: player ? player.ID : '',
    playerStatus: player ? player.Status : '',
    namaAsli: player ? player.NamaAsli : '',
    statusDiPTM: player ? player.StatusDiPTM : '',
    fotoURL: player ? publicImageUrl_(player.FotoFileID, player.FotoURL) : ''
  };
}

function buildPlayerRecord_(email, payload, requirePhoto) {
  payload = payload || {};
  const ktp = onlyDigits_(payload.noKTP);
  const phone = normalizePhoneText_(payload.noTelepon);
  validateKtp_(ktp);
  validatePhone_(phone);
  validateDivision_(payload.divisi);
  validatePtmRole_(payload.statusDiPTM, payload.jabatanPTMLainnya);
  if (!payload.namaAsli) throw new Error('Nama asli wajib diisi.');
  if (!payload.alamat) throw new Error('Alamat wajib diisi.');
  if (!payload.tanggalLahir || isNaN(new Date(payload.tanggalLahir).getTime())) throw new Error('Tanggal lahir wajib valid.');
  if (findRowByValue_(getSheet_(SHEETS.PLAYERS), 'NoKTP', ktp).rowNumber) throw new Error('No KTP sudah terdaftar.');
  const playerId = createId_('PBK');
  const now = new Date();
  let photo = { url: '', fileId: '' };
  if (payload.photo && payload.photo.base64) photo = uploadFile_(payload.photo, playerId, email, 'PLAYER_PHOTO');
  else if (requirePhoto) throw new Error('Foto wajib diupload.');
  return {
    ID: playerId,
    Email: email,
    NamaAsli: requiredText_(payload.namaAsli, 'Nama asli'),
    NamaPanggilan: cleanText_(payload.namaPanggilan),
    FotoURL: photo.url,
    FotoFileID: photo.fileId,
    TanggalLahir: new Date(payload.tanggalLahir),
    NoKTP: ktp,
    Alamat: requiredText_(payload.alamat, 'Alamat'),
    NoTelepon: phone,
    NamaPTM: cleanText_(payload.namaPTM),
    StatusDiPTM: cleanText_(payload.statusDiPTM),
    JabatanPTMLainnya: cleanText_(payload.jabatanPTMLainnya),
    NamaPT: cleanText_(payload.namaPT),
    Divisi: cleanText_(payload.divisi),
    Status: 'Menunggu Verifikasi',
    StatusProfil: 'Aktif',
    KeteranganPemain: '',
    CatatanAdmin: '',
    CreatedAt: now,
    UpdatedAt: now,
    VerifiedAt: '',
    VerifiedBy: '',
    LastPhotoUpdatedAt: photo.fileId ? now : '',
    LastPhoneUpdatedAt: now
  };
}

function buildPTMRecord_(id, email, payload, logo, photos, now, player) {
  validateRequiredPTM_(payload);
  return {
    ID: id,
    NamaPTM: requiredText_(payload.namaPTM, 'Nama PTM'),
    NamaKetua: cleanText_(payload.namaKetua) || player.NamaAsli,
    EmailKetua: email,
    NoTeleponKetua: normalizePhoneText_(payload.noTeleponKetua || player.NoTelepon),
    NoWhatsAppPTM: normalizePhoneText_(payload.noWhatsAppPTM),
    AlamatPTM: requiredText_(payload.alamatPTM, 'Alamat PTM'),
    KecamatanKota: requiredText_(payload.kecamatanKota, 'Kecamatan/Kota'),
    GoogleMapsLink: validateOptionalUrl_(payload.googleMapsLink),
    DeskripsiPTM: requiredText_(payload.deskripsiPTM, 'Deskripsi PTM'),
    SejarahPTM: cleanText_(payload.sejarahPTM),
    JadwalLatihan: cleanText_(payload.jadwalLatihan),
    LogoURL: logo.url,
    LogoFileID: logo.fileId,
    FotoKegiatanJSON: JSON.stringify(photos || []),
    Instagram: validateOptionalUrl_(payload.instagram),
    TikTok: validateOptionalUrl_(payload.tikTok),
    Website: validateOptionalUrl_(payload.website),
    KeteranganPublikPTM: cleanText_(payload.keteranganPublikPTM || payload.keteranganPTM),
    Status: 'Menunggu Verifikasi',
    StatusPTM: 'Aktif',
    KeteranganPTM: cleanText_(payload.keteranganPublikPTM || payload.keteranganPTM),
    CatatanAdmin: '',
    KeteranganAdminPTM: '',
    CreatedBy: email,
    CreatedAt: now,
    UpdatedBy: email,
    UpdatedAt: now,
    VerifiedBy: '',
    VerifiedAt: ''
  };
}

function buildPTMUpdates_(payload, current) {
  payload = payload || {};
  const updates = {};
  current = current || {};
  ['namaKetua', 'alamatPTM', 'kecamatanKota', 'deskripsiPTM', 'sejarahPTM', 'jadwalLatihan'].forEach(function (key) {
    if (key in payload) updates[toPascalKey_(key)] = cleanText_(payload[key]);
  });
  if ('namaPTM' in payload) {
    if (current.Status === 'Terverifikasi' && cleanText_(payload.namaPTM) !== String(current.NamaPTM || '')) {
      throw new Error('Nama PTM tidak bisa diubah setelah Terverifikasi.');
    }
    updates.NamaPTM = requiredText_(payload.namaPTM, 'Nama PTM');
  }
  if ('noTeleponKetua' in payload) updates.NoTeleponKetua = normalizePhoneText_(payload.noTeleponKetua);
  if ('noWhatsAppPTM' in payload) {
    updates.NoWhatsAppPTM = normalizePhoneText_(payload.noWhatsAppPTM);
    validatePhone_(updates.NoWhatsAppPTM);
  }
  if ('googleMapsLink' in payload) updates.GoogleMapsLink = validateOptionalUrl_(payload.googleMapsLink);
  if ('instagram' in payload) updates.Instagram = validateOptionalUrl_(payload.instagram);
  if ('tikTok' in payload) updates.TikTok = validateOptionalUrl_(payload.tikTok);
  if ('website' in payload) updates.Website = validateOptionalUrl_(payload.website);
  if ('keteranganPublikPTM' in payload || 'keteranganPTM' in payload) {
    const publicNote = cleanText_(payload.keteranganPublikPTM || payload.keteranganPTM);
    updates.KeteranganPublikPTM = publicNote;
    updates.KeteranganPTM = publicNote;
  }
  return updates;
}

function validateRequiredPTM_(payload) {
  ['namaPTM', 'noWhatsAppPTM', 'alamatPTM', 'kecamatanKota', 'deskripsiPTM'].forEach(function (key) {
    if (!cleanText_(payload[key])) throw new Error(key + ' wajib diisi.');
  });
  validatePhone_(normalizePhoneText_(payload.noWhatsAppPTM));
}

function adminSaveContent_(sessionToken, sheetName, id, payload, action) {
  try {
    const admin = requireAdmin_(sessionToken, action);
    payload = payload || {};
    const sheet = getSheet_(sheetName);
    const now = new Date();
    let found = id ? findRowByValue_(sheet, 'ID', id) : { rowNumber: 0, object: null };
    let photo = { url: '', fileId: '' };
    if (payload.photo && payload.photo.base64) photo = uploadFile_(payload.photo, id || sheetName, admin.email, sheetName);
    if (sheetName === SHEETS.NEWS) {
      const record = {
        ID: id || createId_('NEWS'),
        Judul: requiredText_(payload.judul, 'Judul'),
        Ringkasan: requiredText_(payload.ringkasan, 'Ringkasan'),
        Isi: requiredText_(payload.isi, 'Isi'),
        FotoURL: photo.url || (found.object && found.object.FotoURL) || '',
        FotoFileID: photo.fileId || (found.object && found.object.FotoFileID) || '',
        Status: validateContentStatusValue_(payload.status || (found.object && found.object.Status) || 'Draft'),
        CreatedBy: found.object ? found.object.CreatedBy : admin.email,
        CreatedAt: found.object ? found.object.CreatedAt : now,
        UpdatedBy: admin.email,
        UpdatedAt: now
      };
      saveRecord_(sheet, found, record);
      writeLog_(admin.email, record.ID, action, { status: record.Status }, found.object || '', record, 'SUCCESS');
      return ok_({ item: privateContent_(record), message: 'Konten berhasil disimpan.' });
    }
    validateAdPayload_(payload);
    const record = {
      ID: id || createId_('AD'),
      TipeIklan: cleanText_(payload.tipeIklan || payload.TipeIklan || 'Marketplace'),
      Judul: requiredText_(payload.judul, 'Judul'),
      Deskripsi: requiredText_(payload.deskripsi, 'Deskripsi'),
      FotoURL: photo.url || (found.object && found.object.FotoURL) || '',
      FotoFileID: photo.fileId || (found.object && found.object.FotoFileID) || '',
      LinkTujuan: validateOptionalUrl_(payload.linkTujuan),
      NamaPengiklan: cleanText_(payload.namaPengiklan),
      Status: validateContentStatusValue_(payload.status || (found.object && found.object.Status) || 'Draft'),
      CreatedBy: found.object ? found.object.CreatedBy : admin.email,
      CreatedAt: found.object ? found.object.CreatedAt : now,
      UpdatedBy: admin.email,
      UpdatedAt: now
    };
    saveRecord_(sheet, found, record);
    writeLog_(admin.email, record.ID, action, { status: record.Status, tipe: record.TipeIklan }, found.object || '', record, 'SUCCESS');
    return ok_({ item: privateContent_(record), message: 'Konten berhasil disimpan.' });
  } catch (err) {
    return fail_(err);
  }
}

function adminSetContentStatus_(sessionToken, sheetName, id, status, action) {
  try {
    const admin = requireAdmin_(sessionToken, action);
    validateContentStatusValue_(status);
    const sheet = getSheet_(sheetName);
    const found = findRowByValue_(sheet, 'ID', id);
    if (!found.rowNumber) throw new Error('Konten tidak ditemukan.');
    const updates = { Status: status, UpdatedBy: admin.email, UpdatedAt: new Date() };
    updateObject_(sheet, found.rowNumber, updates);
    writeLog_(admin.email, id, action, updates, found.object, Object.assign({}, found.object, updates), 'SUCCESS');
    return ok_({ message: 'Status konten berhasil diperbarui.' });
  } catch (err) {
    return fail_(err);
  }
}

function adminDeleteContent_(sessionToken, sheetName, id, action) {
  try {
    const admin = requireAdmin_(sessionToken, action);
    const sheet = getSheet_(sheetName);
    const found = findRowByValue_(sheet, 'ID', id);
    if (!found.rowNumber) throw new Error('Konten tidak ditemukan.');
    sheet.deleteRow(found.rowNumber);
    writeLog_(admin.email, id, action, '', found.object, '', 'SUCCESS');
    return ok_({ message: 'Konten berhasil dihapus.' });
  } catch (err) {
    return fail_(err);
  }
}

function saveRecord_(sheet, found, record) {
  if (found.rowNumber) updateObject_(sheet, found.rowNumber, record);
  else appendObject_(sheet, record);
}

function getUserByEmail_(email) {
  const found = findRowByValue_(getSheet_(SHEETS.USERS), 'Email', normalizeEmail_(email));
  return found.object || null;
}

function getPlayerByEmail_(email) {
  const found = findRowByValue_(getSheet_(SHEETS.PLAYERS), 'Email', normalizeEmail_(email));
  return found.object || null;
}

function getPlayerById_(id) {
  const found = findRowByValue_(getSheet_(SHEETS.PLAYERS), 'ID', String(id || '').trim());
  return found.object || null;
}

function getPTMById_(id) {
  const found = findRowByValue_(getSheet_(SHEETS.PTM), 'ID', String(id || '').trim());
  return found.object || null;
}

function getOwnedPTMByEmail_(email) {
  email = normalizeEmail_(email);
  return readObjects_(getSheet_(SHEETS.PTM)).filter(function (row) {
    return normalizeEmail_(row.CreatedBy) === email || normalizeEmail_(row.EmailKetua) === email;
  })[0] || null;
}

function canEditPTM_(ctx, ptmId, ptm) {
  if (!ctx || !ctx.email) return false;
  if (ctx.role === 'admin') return true;
  ptm = ptm || getPTMById_(ptmId);
  if (!ptm) return false;
  if (normalizeEmail_(ptm.CreatedBy) === ctx.email || normalizeEmail_(ptm.EmailKetua) === ctx.email) return true;
  const access = findPTMAccess_(ptmId, ctx.email).object;
  return !!access &&
    access.AccessStatus === 'Terverifikasi' &&
    ['Ketua PTM', 'Pengurus PTM'].indexOf(String(access.RolePTM || '')) !== -1;
}

function findPTMAccess_(ptmId, email) {
  const sheet = getSheet_(SHEETS.PTM_ACCESS);
  const rows = readObjects_(sheet);
  const targetPTM = String(ptmId || '').trim().toLowerCase();
  const targetEmail = normalizeEmail_(email);
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i].PTMID || '').trim().toLowerCase() === targetPTM && normalizeEmail_(rows[i].Email) === targetEmail) {
      return { rowNumber: i + 2, object: rows[i] };
    }
  }
  return { rowNumber: 0, object: null };
}

function decoratePTMForUser_(ptm, ctx, player, access) {
  const canEdit = canEditPTM_(ctx, ptm.ID, ptm);
  const canRequest = !canEdit &&
    player &&
    ['Ketua PTM', 'Pengurus PTM'].indexOf(String(player.StatusDiPTM || '')) !== -1 &&
    samePTMName_(player.NamaPTM, ptm.NamaPTM) &&
    (!access || access.AccessStatus !== 'Menunggu Verifikasi');
  return Object.assign(privatePTM_(ptm), {
    CanEdit: canEdit,
    CanRequestAccess: canRequest,
    AccessStatus: access ? String(access.AccessStatus || '') : '',
    AccessRolePTM: access ? String(access.RolePTM || '') : ''
  });
}

function samePTMName_(a, b) {
  return normalizePTMName_(a) && normalizePTMName_(a) === normalizePTMName_(b);
}

function normalizePTMName_(value) {
  return cleanText_(value).toLowerCase();
}

function getPTMPublicNote_(ptm) {
  return String(ptm.KeteranganPublikPTM || ptm.KeteranganPTM || '');
}

function findUserByResetToken_(token) {
  const tokenHash = hashToken_(String(token || '').trim());
  if (!tokenHash) return null;
  const rows = readObjects_(getSheet_(SHEETS.USERS));
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i].ResetTokenHash || '') === tokenHash) return { rowNumber: i + 2, object: rows[i] };
  }
  return null;
}

function privatePlayer_(player) {
  return Object.assign(adminPlayer_(player), {
    NoKTPMasked: maskKtp_(player.NoKTP),
    NoKTP: '',
    TanggalLahir: formatDateOnly_(player.TanggalLahir),
    Alamat: String(player.Alamat || ''),
    CatatanAdmin: String(player.CatatanAdmin || '')
  });
}

function adminPlayer_(player) {
  return {
    ID: String(player.ID || ''),
    Email: String(player.Email || ''),
    NamaAsli: String(player.NamaAsli || ''),
    NamaPanggilan: String(player.NamaPanggilan || ''),
    FotoURL: publicImageUrl_(player.FotoFileID, player.FotoURL),
    FotoFileID: String(player.FotoFileID || ''),
    TanggalLahir: formatDateOnly_(player.TanggalLahir),
    NoKTPMasked: maskKtp_(player.NoKTP),
    Alamat: String(player.Alamat || ''),
    NoTelepon: String(player.NoTelepon || ''),
    NamaPTM: String(player.NamaPTM || ''),
    StatusDiPTM: String(player.StatusDiPTM || ''),
    JabatanPTMLainnya: String(player.JabatanPTMLainnya || ''),
    NamaPT: String(player.NamaPT || ''),
    Divisi: String(player.Divisi || ''),
    Status: String(player.Status || ''),
    StatusProfil: normalizeActiveStatus_(player.StatusProfil),
    KeteranganPemain: String(player.KeteranganPemain || ''),
    CatatanAdmin: String(player.CatatanAdmin || ''),
    CreatedAt: formatDate_(player.CreatedAt),
    UpdatedAt: formatDate_(player.UpdatedAt),
    VerifiedAt: formatDate_(player.VerifiedAt),
    VerifiedBy: String(player.VerifiedBy || ''),
    LastPhotoUpdatedAt: formatDate_(player.LastPhotoUpdatedAt),
    LastPhoneUpdatedAt: formatDate_(player.LastPhoneUpdatedAt)
  };
}

function publicPlayer_(player) {
  return {
    ID: String(player.ID || ''),
    NamaAsli: String(player.NamaAsli || ''),
    NamaPanggilan: String(player.NamaPanggilan || ''),
    FotoURL: publicImageUrl_(player.FotoFileID, player.FotoURL),
    Divisi: String(player.Divisi || ''),
    NamaPTM: String(player.NamaPTM || ''),
    StatusDiPTM: String(player.StatusDiPTM || ''),
    NamaPT: String(player.NamaPT || ''),
    Status: String(player.Status || ''),
    StatusProfil: normalizeActiveStatus_(player.StatusProfil),
    KeteranganPemain: String(player.KeteranganPemain || ''),
    UpdatedAt: formatDate_(player.UpdatedAt)
  };
}

function privatePTM_(ptm) {
  return Object.assign(publicPTMDetail_(ptm), {
    EmailKetua: String(ptm.EmailKetua || ''),
    CatatanAdmin: String(ptm.CatatanAdmin || ''),
    KeteranganAdminPTM: String(ptm.KeteranganAdminPTM || ''),
    CreatedBy: String(ptm.CreatedBy || ''),
    CreatedAt: formatDate_(ptm.CreatedAt),
    UpdatedBy: String(ptm.UpdatedBy || ''),
    UpdatedAt: formatDate_(ptm.UpdatedAt),
    VerifiedBy: String(ptm.VerifiedBy || ''),
    VerifiedAt: formatDate_(ptm.VerifiedAt)
  });
}

function publicPTM_(ptm) {
  return {
    ID: String(ptm.ID || ''),
    NamaPTM: String(ptm.NamaPTM || ''),
    NamaKetua: String(ptm.NamaKetua || ''),
    NoWhatsAppPTM: String(ptm.NoWhatsAppPTM || ''),
    KecamatanKota: String(ptm.KecamatanKota || ''),
    DeskripsiPTM: String(ptm.DeskripsiPTM || ''),
    LogoURL: publicImageUrl_(ptm.LogoFileID, ptm.LogoURL),
    Status: String(ptm.Status || ''),
    StatusPTM: normalizeActiveStatus_(ptm.StatusPTM),
    KeteranganPublikPTM: getPTMPublicNote_(ptm),
    KeteranganPTM: getPTMPublicNote_(ptm)
  };
}

function publicPTMDetail_(ptm) {
  return Object.assign(publicPTM_(ptm), {
    NoTeleponKetua: String(ptm.NoTeleponKetua || ''),
    AlamatPTM: String(ptm.AlamatPTM || ''),
    GoogleMapsLink: String(ptm.GoogleMapsLink || ''),
    SejarahPTM: String(ptm.SejarahPTM || ''),
    JadwalLatihan: String(ptm.JadwalLatihan || ''),
    FotoKegiatan: parseJson_(ptm.FotoKegiatanJSON, []),
    Instagram: String(ptm.Instagram || ''),
    TikTok: String(ptm.TikTok || ''),
    Website: String(ptm.Website || ''),
    UpdatedAt: formatDate_(ptm.UpdatedAt)
  });
}

function publicNews_(item) {
  return {
    ID: String(item.ID || ''),
    Judul: String(item.Judul || ''),
    Ringkasan: String(item.Ringkasan || ''),
    Isi: String(item.Isi || ''),
    FotoURL: publicImageUrlSized_(item.FotoFileID, item.FotoURL, 'w800'),
    FotoFileID: String(item.FotoFileID || ''),
    Status: String(item.Status || ''),
    CreatedBy: String(item.CreatedBy || ''),
    CreatedAt: formatDate_(item.CreatedAt),
    UpdatedAt: formatDate_(item.UpdatedAt || item.CreatedAt)
  };
}

function publicAd_(item) {
  return {
    ID: String(item.ID || ''),
    TipeIklan: String(item.TipeIklan || ''),
    Judul: String(item.Judul || ''),
    Deskripsi: String(item.Deskripsi || ''),
    FotoURL: publicImageUrlSized_(item.FotoFileID, item.FotoURL, 'w800'),
    FotoFileID: String(item.FotoFileID || ''),
    LinkTujuan: String(item.LinkTujuan || ''),
    NamaPengiklan: String(item.NamaPengiklan || ''),
    Status: String(item.Status || ''),
    CreatedBy: String(item.CreatedBy || ''),
    CreatedAt: formatDate_(item.CreatedAt),
    UpdatedAt: formatDate_(item.UpdatedAt || item.CreatedAt)
  };
}

function privateContent_(item) {
  return Object.assign(item.TipeIklan ? publicAd_(item) : publicNews_(item), {
    CreatedBy: String(item.CreatedBy || ''),
    CreatedAt: formatDate_(item.CreatedAt),
    UpdatedBy: String(item.UpdatedBy || ''),
    UpdatedAt: formatDate_(item.UpdatedAt)
  });
}

function publicUser_(user) {
  return {
    Email: String(user.Email || ''),
    Role: String(user.Role || ''),
    StatusUser: String(user.StatusUser || ''),
    AuthProvider: String(user.AuthProvider || ''),
    EmailVerified: String(user.EmailVerified || ''),
    CreatedAt: formatDate_(user.CreatedAt),
    LastLoginAt: formatDate_(user.LastLoginAt),
    FailedLoginCount: Number(user.FailedLoginCount || 0),
    LockedUntil: formatDate_(user.LockedUntil),
    LastPasswordResetAt: formatDate_(user.LastPasswordResetAt),
    MustChangePassword: truthy_(user.MustChangePassword)
  };
}

function publicPTMAccess_(row) {
  return {
    ID: String(row.ID || ''),
    PTMID: String(row.PTMID || ''),
    NamaPTM: String(row.NamaPTM || ''),
    Email: String(row.Email || ''),
    NamaUser: String(row.NamaUser || ''),
    RolePTM: String(row.RolePTM || ''),
    AccessStatus: String(row.AccessStatus || ''),
    RequestedAt: formatDate_(row.RequestedAt),
    ApprovedBy: String(row.ApprovedBy || ''),
    ApprovedAt: formatDate_(row.ApprovedAt),
    RejectedBy: String(row.RejectedBy || ''),
    RejectedAt: formatDate_(row.RejectedAt),
    CatatanAdmin: String(row.CatatanAdmin || '')
  };
}

function publicLog_(log) {
  return {
    Timestamp: formatDate_(log.Timestamp),
    ActorEmail: String(log.ActorEmail || ''),
    TargetEmail: String(log.TargetEmail || ''),
    Action: String(log.Action || ''),
    Details: String(log.Details || ''),
    BeforeValue: String(log.BeforeValue || ''),
    AfterValue: String(log.AfterValue || ''),
    Result: String(log.Result || '')
  };
}

function isPublished_(row) {
  return row.Status === 'Published';
}

function uploadFile_(filePayload, entityId, email, category) {
  validateFilePayload_(filePayload);
  const folder = DriveApp.getFolderById(getConfigValue_('FOLDER_FOTO_ID', APP.PHOTO_FOLDER_ID));
  const base64 = stripDataUrl_(filePayload.base64);
  const blob = Utilities.newBlob(Utilities.base64Decode(base64), filePayload.mimeType, buildFileName_(entityId, email, category, filePayload.name));
  const file = folder.createFile(blob);
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (err) {
    console.warn('Drive sharing skipped: ' + err.message);
  }
  return {
    fileId: file.getId(),
    url: file.getUrl(),
    thumbnailUrl: publicImageUrl_(file.getId(), file.getUrl())
  };
}

function uploadManyFiles_(filesPayload, entityId, email, category) {
  if (!Array.isArray(filesPayload)) return [];
  return filesPayload.filter(function (file) { return file && file.base64; }).map(function (file) {
    return uploadFile_(file, entityId, email, category);
  });
}

function validateFilePayload_(filePayload) {
  if (!filePayload || !filePayload.base64) throw new Error('File wajib diupload.');
  const mimeType = String(filePayload.mimeType || '').toLowerCase();
  if (APP.ALLOWED_FILE_TYPES.indexOf(mimeType) === -1) throw new Error('File hanya boleh JPG, PNG, atau WEBP.');
  const base64 = stripDataUrl_(filePayload.base64);
  const actualSize = Math.max(Number(filePayload.size || 0), Math.ceil(base64.length * 3 / 4));
  if (!actualSize || actualSize > Number(getConfigValue_('MAX_UPLOAD_MB', APP.MAX_UPLOAD_MB)) * 1024 * 1024) {
    throw new Error('Ukuran file maksimal ' + getConfigValue_('MAX_UPLOAD_MB', APP.MAX_UPLOAD_MB) + ' MB.');
  }
}

function sendResetPasswordEmail_(email, token, expiresAt) {
  const resetLink = buildResetUrl_(token);
  if (!resetLink) throw new Error('WEB_APP_URL belum valid. Isi URL deployment /exec sebelum fitur reset password dipakai production.');
  const minutes = Number(getConfigValue_('RESET_TOKEN_EXPIRY_MINUTES', APP.RESET_TOKEN_EXPIRY_MINUTES));
  const senderName = getConfigValue_('SYSTEM_SENDER_NAME', APP.NAME);
  const replyTo = getConfigValue_('REPLY_TO_EMAIL', getConfigValue_('ADMIN_EMAIL', ''));
  const adminPhone = getConfigValue_('ADMIN_CONTACT_PHONE', '');
  const htmlBody = [
    '<div style="font-family:Arial,sans-serif;line-height:1.5;color:#222;">',
    '<h2>Reset Password Database Pingpong Bekasi</h2>',
    '<p>Halo,</p>',
    '<p>Kami menerima permintaan untuk mereset password akun Anda di Database Pingpong Bekasi.</p>',
    '<p>Silakan klik tombol berikut untuk membuat password baru:</p>',
    '<p><a href="', htmlEscape_(resetLink), '" style="display:inline-block;padding:10px 16px;background:#0a5f35;color:#fff;text-decoration:none;border-radius:6px;">Reset Password</a></p>',
    '<p>Link ini berlaku selama ', minutes, ' menit, sampai ', formatDate_(expiresAt), '.</p>',
    '<p>Jika Anda tidak meminta reset password, abaikan email ini.</p>',
    adminPhone ? '<p>Kontak admin: ' + htmlEscape_(adminPhone) + '</p>' : '',
    '<hr><p style="font-size:12px;color:#666;">Email ini dikirim otomatis oleh Database Pingpong Bekasi.</p>',
    '</div>'
  ].join('');
  const options = {
    to: email,
    subject: 'Reset Password Database Pingpong Bekasi',
    name: senderName,
    htmlBody: htmlBody
  };
  if (replyTo) options.replyTo = replyTo;
  MailApp.sendEmail(options);
}

function buildResetUrl_(token) {
  const base = getWebAppUrl_();
  if (!base) return '';
  const separator = base.indexOf('?') === -1 ? '?' : '&';
  return base + separator + 'page=reset&token=' + encodeURIComponent(token);
}

function isResetRateLimited_(email) {
  const since = addHours_(new Date(), -1);
  const count = readObjects_(getSheet_(SHEETS.LOG)).filter(function (log) {
    return normalizeEmail_(log.TargetEmail || log.ActorEmail) === normalizeEmail_(email) &&
      log.Action === 'REQUEST_PASSWORD_RESET' &&
      log.Timestamp &&
      new Date(log.Timestamp).getTime() >= since.getTime();
  }).length;
  return count > APP.RESET_RATE_LIMIT_PER_HOUR;
}

function notifyAdmin_(subject, body) {
  const adminEmail = getConfigValue_('ADMIN_EMAIL', '');
  if (!adminEmail) return;
  const senderName = getConfigValue_('SYSTEM_SENDER_NAME', APP.NAME);
  const replyTo = getConfigValue_('REPLY_TO_EMAIL', adminEmail);
  try {
    const options = { to: adminEmail, subject: subject, body: body, name: senderName };
    if (replyTo) options.replyTo = replyTo;
    MailApp.sendEmail(options);
  } catch (err) {
    writeLog_('', adminEmail, 'ADMIN_NOTIFICATION_FAILED', err.message, '', '', 'FAILED');
  }
}

function validateEmail_(email) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ''))) throw new Error('Email tidak valid.');
}

function validatePassword_(password) {
  if (!isValidPassword_(password)) throw new Error('Password minimal 8 karakter dan wajib berisi huruf besar, angka, serta simbol.');
}

function isValidPassword_(password) {
  return /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(String(password || ''));
}

function validateKtp_(ktp) {
  if (!/^\d{16}$/.test(String(ktp || ''))) throw new Error('No KTP wajib 16 digit angka.');
}

function validatePhone_(phone) {
  if (!/^\d{9,15}$/.test(String(phone || ''))) throw new Error('No telepon wajib 9-15 digit angka.');
}

function validateDivision_(division) {
  if (getDivisions_().indexOf(cleanText_(division)) === -1) throw new Error('Divisi tidak valid.');
}

function validatePtmRole_(role, otherRole) {
  role = cleanText_(role);
  if (APP.PTM_ROLES.indexOf(role) === -1) throw new Error('Status di PTM tidak valid.');
  if (role === 'Lainnya' && !cleanText_(otherRole)) throw new Error('Jabatan PTM lainnya wajib diisi.');
}

function validateStatus_(value, allowed, label) {
  if (allowed.indexOf(cleanText_(value)) === -1) throw new Error(label + ' tidak valid.');
}

function validateActiveStatus_(value, label) {
  validateStatus_(value, APP.ACTIVE_STATUSES, label);
}

function normalizeActiveStatus_(value) {
  value = cleanText_(value);
  return APP.ACTIVE_STATUSES.indexOf(value) === -1 ? 'Aktif' : value;
}

function isPublicPlayer_(player) {
  return player && player.Status === 'Terverifikasi' && normalizeActiveStatus_(player.StatusProfil) === 'Aktif';
}

function isPublicPTM_(ptm) {
  return ptm && ptm.Status === 'Terverifikasi' && normalizeActiveStatus_(ptm.StatusPTM) === 'Aktif';
}

function validateContentStatusValue_(status) {
  status = cleanText_(status || 'Draft');
  validateStatus_(status, APP.CONTENT_STATUSES, 'Status konten');
  return status;
}

function validateAdPayload_(payload) {
  const type = cleanText_(payload.tipeIklan || payload.TipeIklan || 'Marketplace');
  validateStatus_(type, APP.AD_TYPES, 'Tipe iklan');
  if (payload.linkTujuan) validateOptionalUrl_(payload.linkTujuan);
}

function validateOptionalUrl_(value) {
  value = cleanText_(value);
  if (!value) return '';
  if (!/^https?:\/\/[^\s]+$/i.test(value) || /^javascript:/i.test(value)) throw new Error('URL harus valid dan diawali http:// atau https://.');
  return value;
}

function requiredText_(value, label) {
  const text = cleanText_(value);
  if (!text) throw new Error(label + ' wajib diisi.');
  return text;
}

function registerFailedLogin_(users, rowNumber, user) {
  const failures = Number(user.FailedLoginCount || 0) + 1;
  const updates = { FailedLoginCount: failures };
  if (failures >= APP.MAX_LOGIN_FAILURES) updates.LockedUntil = addMinutes_(new Date(), APP.LOCK_MINUTES);
  updateObject_(users, rowNumber, updates);
}

function isLocked_(value) {
  return value && new Date(value).getTime() > new Date().getTime();
}

function isExpired_(value) {
  return !value || new Date(value).getTime() <= new Date().getTime();
}

function hashPassword_(password, salt) {
  return sha256Hex_(String(salt || '') + ':' + String(password || ''));
}

function hashToken_(token) {
  return sha256Hex_('token:' + String(token || ''));
}

function sha256Hex_(value) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value, Utilities.Charset.UTF_8);
  return digest.map(function (byte) {
    const v = (byte < 0 ? byte + 256 : byte).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

function secureCompare_(a, b) {
  a = String(a || '');
  b = String(b || '');
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function newSalt_() {
  return Utilities.getUuid() + '-' + Math.floor(Math.random() * 1000000000);
}

function newToken_() {
  return Utilities.getUuid() + '-' + Utilities.getUuid();
}

function createId_(prefix) {
  return prefix + '-' + Utilities.formatDate(new Date(), APP.TIME_ZONE, 'yyyyMMdd') + '-' + Utilities.getUuid().slice(0, 8).toUpperCase();
}

function buildFileName_(entityId, email, category, originalName) {
  const ext = String(originalName || '').split('.').pop() || 'jpg';
  return [category, entityId, sanitizeFilePart_(email), Utilities.formatDate(new Date(), APP.TIME_ZONE, 'yyyyMMddHHmmss')].join('_') + '.' + ext.toLowerCase();
}

function publicImageUrl_(fileId, fallback) {
  return publicImageUrlSized_(fileId, fallback, 'w400');
}

function publicImageUrlSized_(fileId, fallback, size) {
  fileId = String(fileId || '').trim();
  if (fileId) return 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(fileId) + '&sz=' + encodeURIComponent(size || 'w400');
  return String(fallback || '');
}

function getDivisions_() {
  return String(getConfigValue_('DIVISI', APP.DEFAULT_DIVISIONS.join(','))).split(',').map(cleanText_).filter(Boolean);
}

function getWebAppUrl_() {
  const configured = cleanText_(getConfigValue_('WEB_APP_URL', ''));
  if (isValidWebAppUrl_(configured)) return configured;
  return '';
}

function isValidWebAppUrl_(url) {
  return /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec(?:[?#].*)?$/i.test(String(url || '').trim());
}

function getAdminContact_() {
  const whatsapp = cleanText_(getConfigValue_('ADMIN_WHATSAPP', ''));
  const message = getConfigValue_('AD_INQUIRY_TEXT', 'Halo Admin Database Pingpong Bekasi, saya ingin bertanya mengenai pemasangan iklan di website.');
  const whatsappValid = isValidWhatsAppNumber_(whatsapp);
  return {
    name: getConfigValue_('ADMIN_CONTACT_NAME', 'Admin Database Pingpong Bekasi'),
    phone: getConfigValue_('ADMIN_CONTACT_PHONE', '081234567890'),
    whatsapp: whatsapp,
    whatsappValid: whatsappValid,
    whatsappUrl: whatsappValid ? 'https://wa.me/' + whatsapp + '?text=' + encodeURIComponent(message) : '',
    email: getConfigValue_('ADMIN_EMAIL', ''),
    adInquiryText: message
  };
}

function isValidWhatsAppNumber_(value) {
  return /^62[1-9]\d{7,14}$/.test(String(value || '').trim());
}

function getConfigValue_(key, fallback) {
  const value = getConfigValueRaw_(key);
  return value === '' ? fallback : value;
}

function getConfigValueRaw_(key) {
  const sheet = getSpreadsheet_().getSheetByName(SHEETS.CONFIG);
  if (!sheet) return '';
  const found = findRowByValue_(sheet, 'Key', key);
  return found.rowNumber ? String(found.object.Value || '').trim() : '';
}

function getConfigMap_() {
  const sheet = getSpreadsheet_().getSheetByName(SHEETS.CONFIG);
  if (!sheet) return {};
  const map = {};
  readObjects_(sheet).forEach(function (row) {
    if (row.Key) map[String(row.Key).trim()] = String(row.Value || '').trim();
  });
  return map;
}

function updateConfigValue_(key, value) {
  const sheet = getSheet_(SHEETS.CONFIG);
  const found = findRowByValue_(sheet, 'Key', key);
  if (found.rowNumber) updateObject_(sheet, found.rowNumber, { Value: value });
  else appendObject_(sheet, { Key: key, Value: value });
}

function writeLog_(actorEmail, targetEmail, action, details, beforeValue, afterValue, result) {
  try {
    appendObject_(getSheet_(SHEETS.LOG), {
      Timestamp: new Date(),
      ActorEmail: normalizeEmail_(actorEmail),
      TargetEmail: normalizeEmail_(targetEmail),
      Action: action,
      Details: stringifySafe_(maskSensitiveObject_(details)),
      BeforeValue: stringifySafe_(maskSensitiveObject_(beforeValue)),
      AfterValue: stringifySafe_(maskSensitiveObject_(afterValue)),
      Result: result || 'SUCCESS'
    });
  } catch (err) {
    console.error('writeLog_ failed: ' + err.message);
  }
}

function maskSensitiveObject_(value) {
  if (!value || typeof value !== 'object') return value;
  const copy = Array.isArray(value) ? [] : {};
  Object.keys(value).forEach(function (key) {
    const lower = key.toLowerCase();
    if (lower.indexOf('password') !== -1 || lower.indexOf('token') !== -1 || lower.indexOf('hash') !== -1 || lower.indexOf('salt') !== -1) {
      copy[key] = '[REDACTED]';
    } else if (lower === 'noktp' || lower === 'no_ktp') {
      copy[key] = maskKtp_(value[key]);
    } else if (lower.indexOf('email') !== -1) {
      copy[key] = maskEmail_(value[key]);
    } else if (value[key] && typeof value[key] === 'object') {
      copy[key] = maskSensitiveObject_(value[key]);
    } else {
      copy[key] = value[key];
    }
  });
  return copy;
}

function diffObjects_(before, after) {
  const diff = {};
  Object.keys(after || {}).forEach(function (key) {
    if (String(before[key] || '') !== String(after[key] || '')) diff[key] = { before: before[key], after: after[key] };
  });
  return maskSensitiveObject_(diff);
}

function stringifySafe_(value) {
  if (value === '' || value === null || typeof value === 'undefined') return '';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function getSpreadsheet_() {
  return SpreadsheetApp.openById(APP.SPREADSHEET_ID);
}

function getSheet_(name) {
  setupSheetIfMissing_(name);
  return getSpreadsheet_().getSheetByName(name);
}

function setupSheetIfMissing_(name) {
  const ss = getSpreadsheet_();
  if (!ss.getSheetByName(name)) ensureSheet_(ss, name, HEADERS[name]);
}

function ensureSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  const current = getHeaders_(sheet);
  if (!current.length || current.every(function (item) { return !item; })) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    const missing = headers.filter(function (header) { return current.indexOf(header) === -1; });
    if (missing.length) sheet.getRange(1, current.length + 1, 1, missing.length).setValues([missing]);
  }
  sheet.setFrozenRows(1);
  applyTextFormats_(sheet);
  return sheet;
}

function backfillDefaultColumn_(sheetName, columnName, defaultValue) {
  const sheet = getSpreadsheet_().getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return;
  const headers = getHeaders_(sheet);
  const col = headers.indexOf(columnName) + 1;
  if (!col) return;
  const range = sheet.getRange(2, col, sheet.getLastRow() - 1, 1);
  const values = range.getValues();
  let changed = false;
  const updated = values.map(function (row) {
    if (String(row[0] || '').trim()) return row;
    changed = true;
    return [defaultValue];
  });
  if (changed) range.setValues(updated);
}

function backfillPTMPublicNote_() {
  const sheet = getSpreadsheet_().getSheetByName(SHEETS.PTM);
  if (!sheet || sheet.getLastRow() < 2) return;
  const headers = getHeaders_(sheet);
  const publicCol = headers.indexOf('KeteranganPublikPTM') + 1;
  const legacyCol = headers.indexOf('KeteranganPTM') + 1;
  if (!publicCol || !legacyCol) return;
  const publicRange = sheet.getRange(2, publicCol, sheet.getLastRow() - 1, 1);
  const publicValues = publicRange.getValues();
  const legacyValues = sheet.getRange(2, legacyCol, sheet.getLastRow() - 1, 1).getValues();
  let changed = false;
  const updated = publicValues.map(function (row, idx) {
    if (String(row[0] || '').trim() || !String(legacyValues[idx][0] || '').trim()) return row;
    changed = true;
    return [legacyValues[idx][0]];
  });
  if (changed) publicRange.setValues(updated);
}

function applyTextFormats_(sheet) {
  const name = sheet.getName();
  const textHeaders = TEXT_COLUMNS[name] || [];
  if (!textHeaders.length) return;
  const headers = getHeaders_(sheet);
  textHeaders.forEach(function (header) {
    const col = headers.indexOf(header) + 1;
    if (col > 0) sheet.getRange(1, col, Math.max(sheet.getMaxRows(), 1), 1).setNumberFormat('@');
  });
}

function getHeaders_(sheet) {
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  return sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(function (header) {
    return String(header || '').trim();
  }).filter(Boolean);
}

function sameHeaders_(actual, expected) {
  return expected.every(function (header) { return actual.indexOf(header) !== -1; });
}

function readObjects_(sheet) {
  const headers = getHeaders_(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  return values.map(function (row) {
    const obj = {};
    headers.forEach(function (header, idx) { obj[header] = row[idx]; });
    return obj;
  }).filter(function (obj) {
    return Object.keys(obj).some(function (key) { return obj[key] !== '' && obj[key] !== null; });
  });
}

function appendObject_(sheet, object) {
  const headers = getHeaders_(sheet);
  sheet.appendRow(headers.map(function (header) { return typeof object[header] === 'undefined' ? '' : object[header]; }));
}

function updateObject_(sheet, rowNumber, updates) {
  const headers = getHeaders_(sheet);
  Object.keys(updates).forEach(function (key) {
    const col = headers.indexOf(key) + 1;
    if (col > 0) sheet.getRange(rowNumber, col).setValue(updates[key]);
  });
}

function findRowByValue_(sheet, columnName, value) {
  const headers = getHeaders_(sheet);
  const col = headers.indexOf(columnName);
  if (col === -1) return { rowNumber: 0, object: null };
  const target = String(value || '').trim().toLowerCase();
  const rows = readObjects_(sheet);
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][columnName] || '').trim().toLowerCase() === target) return { rowNumber: i + 2, object: rows[i] };
  }
  return { rowNumber: 0, object: null };
}

function cleanText_(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function normalizeEmail_(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizePhoneText_(value) {
  return onlyDigits_(value);
}

function onlyDigits_(value) {
  return String(value || '').replace(/\D/g, '');
}

function stripDataUrl_(value) {
  return String(value || '').replace(/^data:[^;]+;base64,/, '');
}

function sanitizeFilePart_(value) {
  return String(value || '').replace(/[^A-Za-z0-9._-]/g, '-');
}

function maskKtp_(value) {
  const digits = onlyDigits_(value);
  if (digits.length < 8) return '';
  return digits.slice(0, 4) + '********' + digits.slice(-4);
}

function maskEmail_(email) {
  email = normalizeEmail_(email);
  if (!email || email.indexOf('@') === -1) return '';
  const parts = email.split('@');
  return parts[0].slice(0, 2) + '***@' + parts[1];
}

function formatDate_(value) {
  if (!value) return '';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '';
  return Utilities.formatDate(date, APP.TIME_ZONE, 'dd/MM/yyyy HH:mm');
}

function formatDateOnly_(value) {
  if (!value) return '';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '';
  return Utilities.formatDate(date, APP.TIME_ZONE, 'yyyy-MM-dd');
}

function addHours_(date, hours) {
  return new Date(date.getTime() + Number(hours) * 60 * 60 * 1000);
}

function addMinutes_(date, minutes) {
  return new Date(date.getTime() + Number(minutes) * 60 * 1000);
}

function truthy_(value) {
  return value === true || String(value).toLowerCase() === 'true';
}

function parseJson_(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch (err) {
    return fallback;
  }
}

function htmlEscape_(value) {
  return String(value || '').replace(/[&<>"']/g, function (char) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
  });
}

function toPascalKey_(key) {
  return String(key || '').replace(/(^|_|\s|-)([a-z])/g, function (_, __, char) { return char.toUpperCase(); });
}

function playerActionForStatus_(status, fallback) {
  if (status === 'Terverifikasi') return 'ADMIN_VERIFY_PLAYER';
  if (status === 'Ditolak') return 'ADMIN_REJECT_PLAYER';
  return fallback;
}

function ok_(data) {
  return Object.assign({ ok: true }, data || {});
}

function fail_(err) {
  return { ok: false, message: err && err.message ? err.message : String(err) };
}

function check_(name, pass, detail) {
  return { name: name, pass: !!pass, detail: detail || '' };
}

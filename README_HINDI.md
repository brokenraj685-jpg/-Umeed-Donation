# Umeed Donation PWA — Setup Guide (Hindi)

## Project mein kya hai
- Responsive PWA website (mobile home-screen install support)
- Donation form: naam, state, amount, UPI transaction reference
- Donation default `pending` rahega; verify hone ke baad hi public leaderboard mein aayega
- Admin login (Firebase Email/Password)
- Admin: donation verify/reject, website text aur payment QR/UPI settings edit
- Photos/videos Cloudflare R2 par upload karne ka signed-URL endpoint
- Firestore security rules aur Vercel deployment config

## 1. Firebase setup
1. Firebase Console par naya project banayein.
2. Authentication > Sign-in method > Email/Password enable karein.
3. Firestore Database create karein.
4. Project settings > Your apps > Web app se config values copy karein.
5. `.env.example` ki copy bana kar `.env` naam dein aur `VITE_FIREBASE_*` values bharein.
6. Firestore > Rules mein `firestore.rules` ka content publish karein.
7. Firebase Authentication mein admin email/password user banayein.
8. IMPORTANT: Admin account ko custom claim `admin: true` dena zaroori hai. Firebase Admin SDK wali trusted environment/Cloud Function se custom claim set karein:
   `await getAuth().setCustomUserClaims(uid, { admin: true })`
   Client-side se admin claim set na karein. Is starter ka admin UI Firebase sign-in karta hai, lekin Firestore rules admin claim ke bina admin writes allow nahi karengi.
9. Firestore mein `site` collection ke andar `settings` document create karein. Example:
   `siteName: "Umeed", tagline: "Together, we can bring hope.", about: "...", upiId: "", upiName: "", phone: "", qrUrl: "", heroImage: "", totalHelped: "0"`

## 2. Cloudflare R2 setup
1. Cloudflare Dashboard > R2 mein bucket banayein.
2. R2 API token banayein jisme sirf us bucket ke liye Object Read & Write permission ho.
3. Public media delivery ke liye custom domain connect karein. Public bucket ko direct public expose karne se pehle privacy/consent check karein.
4. Bucket CORS mein apne Vercel domain ko allow karein:
   - Allowed origins: `https://YOUR-PROJECT.vercel.app` and local dev origin `http://localhost:5173`
   - Allowed methods: `PUT`, `GET`, `HEAD`
   - Allowed headers: `Content-Type`
   - Expose headers: `ETag`
5. Vercel project settings mein `.env.example` ke R2 variables add karein.
6. NOTE: Signed upload endpoint par Firebase admin-token verification add karna production se pehle mandatory hai. Is starter endpoint abhi clearly marked development scaffold hai. Do not leave public uploads enabled on a live site.

## 3. GitHub + Vercel deploy
1. ZIP extract karein.
2. Saari files GitHub repository ke root mein upload karein (src, api, public folders bhi).
3. Vercel > Add New > Project > GitHub repo import karein.
4. Framework: Vite. Build command `npm run build`, output directory `dist`.
5. Vercel Environment Variables mein Firebase aur R2 values add karein.
6. Deploy karein. Environment variables add/change karne ke baad redeploy zaroor karein.

## 4. Local test
```bash
npm install
cp .env.example .env
npm run dev
```

## 5. Zaroori production improvements
- R2 presign API Firebase ID token + `admin` custom claim verify karta hai. Live launch se pehle upload size limits, rate limiting, abuse monitoring aur content moderation add karein.
- Admin UI route ko bhi `admin` custom claim se gate karein. Firestore rules already admin custom claim require karti hain.
- Donation proof upload (optional) aur duplicate transaction reference checks add karein.
- Donation payment verification manual hai: bank/UPI app mein payment confirm karne ke baad hi admin Verify kare.
- Donor consent checkbox add karein before publishing name/state/amount publicly; privacy policy and terms add karein.
- India mein public donation solicitation se pehle apni legal/charitable structure, tax treatment, FCRA (if foreign contributions), payment-provider rules, and applicable registrations/permissions professional se verify karein. 80G claim tabhi karein jab eligible approval ho.
- Website par fabricated impact figures ya unverified claims na daalein.

## Important
Yeh first working starter scaffold hai, fully production-audited fundraising platform nahi. Firebase config, admin custom claim, R2 credentials, bucket CORS aur live payment verification setup ke bina live donations accept na karein.

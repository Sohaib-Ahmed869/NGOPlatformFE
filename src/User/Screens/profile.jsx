// The user profile reuses the exact admin profile screen — identical design,
// fields, avatar upload and password flow. Both run on the same ProfileService
// (the user's own profile), and the screen shows "Member" for non-admin roles,
// so there is nothing admin-specific to strip. Re-exporting keeps the two in
// perfect sync with zero duplication.
export { default } from "../../Admin/Screens/AdminProfile";

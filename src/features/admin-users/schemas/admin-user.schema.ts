import { z } from 'zod';

/**
 * `app_role` allow-list mirrors `Database['public']['Enums']['app_role']`
 * (`admin-users/types.ts`, sourced from the Lean V2 migrations). Kept as a
 * literal tuple rather than importing the generated type so Zod can build a
 * runtime `z.enum` from it directly.
 */
export const ADMIN_USER_ROLES = ['admin', 'preparation', 'customer'] as const;

export const adminUserCreateFormSchema = z.object({
  displayName: z.string().trim().min(1, 'Display name is required.'),
  email: z
    .string()
    .trim()
    .min(1, 'Email is required.')
    .pipe(z.email('Enter a valid email address.')),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
  role: z.enum(ADMIN_USER_ROLES),
});

export type AdminUserCreateFormValues = z.infer<typeof adminUserCreateFormSchema>;

export const adminUserCreateFormDefaultValues: AdminUserCreateFormValues = {
  displayName: '',
  email: '',
  password: '',
  role: 'preparation',
};

export const adminUserEditFormSchema = z.object({
  displayName: z.string().trim().min(1, 'Display name is required.'),
  role: z.enum(ADMIN_USER_ROLES),
});

export type AdminUserEditFormValues = z.infer<typeof adminUserEditFormSchema>;

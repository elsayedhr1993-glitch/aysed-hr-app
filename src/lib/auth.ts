import { useState, useEffect } from 'react';

export interface UserProfile {
  id: string;
  email?: string;
  name?: string;
  role?: string;
  company_id?: string;
  [key: string]: any;
}

export function useAuth() {
  const [profile, setProfile] = useState<UserProfile | null>({
    id: 'admin-hr-user',
    email: 'hr@aysed.com',
    name: 'مسؤول الموارد البشرية',
    role: 'hr_admin',
    company_id: 'default-company',
  });

  return { profile, setProfile };
}

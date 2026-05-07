export interface User {
  id: string;
  name: string;
  email: string;
  city?: string;
  state?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

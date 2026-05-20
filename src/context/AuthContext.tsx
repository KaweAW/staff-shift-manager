import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface User {
  id_titolare: number;
  email: string;
  nome: string;
  invisibile: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  checkEmail: (email: string) => Promise<{ exists: boolean; needsSetup: boolean; nome: string | null }>;
  setupPassword: (email: string, password_chiara: string) => Promise<{ success: boolean; error?: string }>;
  login: (email: string, password_chiara: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const hashPassword = async (password: string): Promise<string> => {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const storedUserId = localStorage.getItem('barManager_userId');
      if (storedUserId) {
        const { data } = await supabase
          .from('utenti_titolari')
          .select('id_titolare, email, nome, invisibile')
          .eq('id_titolare', parseInt(storedUserId))
          .single();
        
        if (data) {
          setUser(data);
          supabase.from('utenti_titolari').update({ ultimo_accesso: new Date().toISOString() }).eq('id_titolare', data.id_titolare).then();
        } else {
          localStorage.removeItem('barManager_userId');
        }
      }
      setLoading(false);
    };

    checkSession();
  }, []);

  const checkEmail = async (email: string) => {
    const { data, error } = await supabase
      .from('utenti_titolari')
      .select('nome, password_configurata')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (error || !data) return { exists: false, needsSetup: false, nome: null };
    return { exists: true, needsSetup: !data.password_configurata, nome: data.nome };
  };

  const setupPassword = async (email: string, password_chiara: string) => {
    try {
      const hashedPassword = await hashPassword(password_chiara);
      
      const { data, error } = await supabase
        .from('utenti_titolari')
        .update({ 
          password_hash: hashedPassword, 
          password_configurata: true,
          ultimo_accesso: new Date().toISOString()
        })
        .eq('email', email.toLowerCase().trim())
        .select('id_titolare, email, nome, invisibile')
        .single();

      if (error || !data) return { success: false, error: 'Errore durante il salvataggio della password.' };

      setUser(data);
      localStorage.setItem('barManager_userId', data.id_titolare.toString());
      return { success: true };
    } catch (err) {
      return { success: false, error: 'Errore di crittografia.' };
    }
  };

  const login = async (email: string, password_chiara: string) => {
    try {
      const hashedPassword = await hashPassword(password_chiara);

      const { data, error } = await supabase
        .from('utenti_titolari')
        .select('id_titolare, email, nome, invisibile, password_hash')
        .eq('email', email.toLowerCase().trim())
        .single();

      if (error || !data || data.password_hash !== hashedPassword) {
        return { success: false, error: 'Credenziali non valide.' };
      }

      const { password_hash, ...safeUser } = data;

      setUser(safeUser);
      localStorage.setItem('barManager_userId', safeUser.id_titolare.toString());
  
      await supabase.from('utenti_titolari').update({ ultimo_accesso: new Date().toISOString() }).eq('id_titolare', safeUser.id_titolare);

      return { success: true };
    } catch (err) {
      return { success: false, error: 'Errore di sistema durante il login.' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('barManager_userId');
  };

  return (
    <AuthContext.Provider value={{ user, loading, checkEmail, setupPassword, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve essere usato dentro un AuthProvider');
  }
  return context;
};
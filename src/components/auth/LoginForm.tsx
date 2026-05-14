'use client';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';

const schema = z.object({
  email: z.string().min(1, 'E-mail obrigatório').email('E-mail inválido'),
  senha: z.string().min(1, 'Senha obrigatória'),
});
type FormValues = z.infer<typeof schema>;

const ERRO_GENERICO = 'Credenciais inválidas.';

export function LoginForm() {
  const { signIn, signOut } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [erro, setErro] = React.useState<string | null>(null);

  // Se o AuthGuard nos mandou de volta com ?erro=credenciais (sessao
  // valida no Auth mas sem perfil ativo), mostra a mesma mensagem
  // generica — nao vazamos o motivo real para evitar dar dica a um
  // atacante. useEffect garante que pegamos o param mesmo se o
  // primeiro render do Suspense ainda nao tinha resolvido.
  React.useEffect(() => {
    if (searchParams?.get('erro') === 'credenciais') {
      setErro(ERRO_GENERICO);
    }
  }, [searchParams]);

  const [mostrarSenha, setMostrarSenha] = React.useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', senha: '' },
  });

  const onSubmit = async (data: FormValues) => {
    setErro(null);
    try {
      await signIn(data.email, data.senha);
      // Apos signIn, valida que existe perfil_operadores ativo. Sem
      // isso, encerra a sessao e mostra erro generico — evita flash
      // de tela autenticada e nao diferencia "senha errada" de "sem
      // perfil" / "perfil inativo".
      const sb = getSupabaseBrowserClient();
      const { data: userResp } = await sb.auth.getUser();
      const uid = userResp.user?.id;
      if (!uid) {
        setErro(ERRO_GENERICO);
        return;
      }
      const { data: perfil } = await sb
        .from('perfis_operadores')
        .select('ativo')
        .eq('id', uid)
        .maybeSingle();
      if (!perfil?.ativo) {
        await signOut();
        setErro(ERRO_GENERICO);
        return;
      }
      router.replace('/');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha no login';
      // Qualquer erro do supabase auth (invalid credentials, rate limit,
      // user not found, etc.) vira a mesma mensagem.
      setErro(/invalid.*credential|invalid_grant|email|password|user/i.test(msg)
        ? ERRO_GENERICO
        : msg);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" type="email" autoComplete="email" {...register('email')} />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="senha">Senha</Label>
        <div className="relative">
          <Input
            id="senha"
            type={mostrarSenha ? 'text' : 'password'}
            autoComplete="current-password"
            className="pr-10"
            {...register('senha')}
          />
          <button
            type="button"
            onClick={() => setMostrarSenha((v) => !v)}
            aria-label={mostrarSenha ? 'Ocultar caracteres' : 'Exibir caracteres'}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            tabIndex={-1}
          >
            {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.senha && <p className="text-sm text-destructive">{errors.senha.message}</p>}
      </div>

      {erro && <p className="text-sm text-destructive" role="alert">{erro}</p>}

      <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
        {isSubmitting ? 'Entrando...' : 'Entrar'}
      </Button>
    </form>
  );
}

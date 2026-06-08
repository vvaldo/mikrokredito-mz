<template>
  <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;background:var(--color-background-tertiary)">
    <div style="text-align:center;max-width:360px">
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style="margin:0 auto 16px">
        <rect width="48" height="48" rx="12" fill="#E6F1FB"/>
        <path d="M8 16l16 12 16-12" stroke="#185FA5" stroke-width="2"/>
        <rect x="8" y="14" width="32" height="22" rx="2" stroke="#185FA5" stroke-width="2"/>
      </svg>
      <h2 style="font-size:20px;font-weight:500;margin-bottom:8px">Verifique o seu email</h2>
      <p style="font-size:13px;color:var(--color-text-secondary);line-height:1.6;margin-bottom:24px">
        Enviámos um link de verificação para o seu email. Clique no link para activar a sua conta.
      </p>
      <RouterLink to="/login" class="btn btn-primary">Ir para o login</RouterLink>
    </div>
  </div>
</template>
<script setup></script>

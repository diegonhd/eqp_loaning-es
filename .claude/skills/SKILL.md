@"
---
name: code-review
description: Use esta skill sempre que for revisar código (após escrever, editar, ou quando o usuário pedir uma revisão). Cobre checklist de qualidade, segurança, performance e boas práticas para revisão de código em qualquer linguagem.
---

# Skill: Revisão de Código

Ao revisar qualquer trecho de código, siga este processo:

## 1. Leitura inicial
- Entenda o propósito do código antes de criticar
- Identifique a linguagem e o framework usado
- Verifique se há testes associados

## 2. Checklist de revisão

### Legibilidade
- Nomes de variáveis e funções são claros?
- Há complexidade desnecessária (funções muito longas, aninhamento profundo)?
- Comentários explicam o "porquê", não o "o quê"?

### Segurança
- Há inputs de usuário não validados/sanitizados?
- Segredos (API keys, senhas) hardcoded no código?
- Vulnerabilidades comuns (SQL injection, XSS, path traversal)?

### Performance
- Loops ou queries desnecessariamente custosos (ex: N+1)?
- Uso incorreto de estruturas de dados?
- Operações bloqueantes que deveriam ser assíncronas?

### Boas práticas
- Segue as convenções idiomáticas da linguagem?
- Tratamento de erros adequado (não engolir exceções silenciosamente)?
- Duplicação de código que poderia ser abstraída?

## 3. Formato da resposta

Para cada problema encontrado, reporte assim:

**[Severidade: Alta/Média/Baixa] Arquivo:linha**
- Problema: descrição objetiva
- Sugestão: código ou abordagem corrigida
- Motivo: por que isso importa

## 4. Tom
Seja direto e específico. Elogios genéricos não ajudam — se o código está bom, diga o que especificamente está bom (ex: "boa separação de responsabilidades aqui"). Priorize os problemas de severidade alta primeiro.

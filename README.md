# Projeto de Estrutura de Dados - Controle das Ferramentas de um Laboratório
Projeto feito com auxílio do Assistente de IA Claude

## Decisões assumidas: profundidade e precisão do impacto declarado 

1) Granularidade das entidades
### Decisão 
O domínio do banco foi dividido em 5 entidades: Aluno, Equipamento, Técnico, Empréstimo e Pendência em vez de apenas ALuno, Equipamento, Técnico e Empréstimo - que teria um ENUM de status associados a todos os tipos de pendência - o que seria ineficiente).

### Precisão
O requisito do projeto explicita apenas que "Aluno com pendência não pode pegar mais nada". Logo, se a pendência tivesse apenas presente em um ENUM em um atributo status da tabela Empréstimo, o sistema não conseguiria representar bloqueios que não nascem de um empréstimo aberto. Esse formato faz com que se consiga separar as condições de empréstimo relacionados à devolução do equipamento - `Devolvido`, `Atrasado`, `Em Andamento` - dos outros tipos (`Atraso`, `Dano`, ...) já que não são estados mutualmente excludentes, ou seja, um equipamento devolvido foi danificado pelo aluno que o alugou não tem pendência de devolução, mas ainda possui uma pendência de dano associada a ele.

### Profundida
Essa separação resolve qualquer tipo futuro de pendência (multa, advertência, dano) sem alterar a estrutura de `Emprestimo`.

2) Técnico como entidade própria
### Decisão
Criar uma tabela `Técnico` com atributos id, nome e matricula, em vez de um campo de texto livre ou um sistema completo de login de usuários.

### Precisão


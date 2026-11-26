# Como registrar certificados

Meus Certificados guarda seus comprovantes de horas complementares, congressos, cursos e publicações, e soma as horas que você conferiu. Só você vê.

**Quem pode:** aluno com o primeiro acesso concluído. **Onde:** **Meus Certificados** (`/app/competencias`), no menu do **Meu Espaço**. Cada certificado abre em `/app/competencias/<id>`.

## Antes de começar

- Depende da chave de módulo **Competências: Meus Certificados** (`competencias`). Com ela desligada, a página não existe.
- A leitura automática do certificado depende do interruptor de IA **Leitura dos certificados (Competências)** (`certificados`) e da autorização **Leitura dos seus materiais pela IA** (`ai_materials`), em Privacidade. Sem isso, você preenche os campos à mão.
- Arquivos aceitos: PDF ou foto (JPG, PNG, WebP). O arquivo passa pelo antivírus.

## Passo a passo

### Enviar o certificado

1. Abra **Meus Certificados**.
2. Clique em **Enviar certificado** e escolha o arquivo. Se não tiver arquivo, clique em **Registrar sem arquivo**.
3. A tela do certificado abre. Enquanto o Cognuss verifica e lê o arquivo, aparece o selo **Lendo** e o aviso "O Cognuss está verificando o arquivo e lendo o certificado. Em instantes os campos aparecem para você conferir." A página se atualiza sozinha.

### Conferir e confirmar

1. Quando a leitura termina, o quadro **Confira os dados** mostra os campos propostos. Se vieram da IA, aparece o aviso "Gerado por IA, sem revisão: confira antes de confirmar."
2. Compare com o **Comprovante**, ao lado. Para ver o arquivo inteiro, clique em **Abrir** seguido do nome do arquivo.
3. Corrija o que for preciso:
   - **Nome da atividade** (obrigatório, pelo menos 3 letras para confirmar)
   - **Tipo**, **Instituição que emitiu**, **Seu papel**
   - **Início** e **Término** (igual ao início se foi um dia só)
   - **Carga horária**, como "20", "4h30" ou "90 min"
   - **Nome no certificado**, **Link de verificação ou DOI**, **Pasta**, **Observações**
4. Clique em **Conferi, confirmar**. Para deixar para depois, clique em **Salvar e conferir depois**.

## O que acontece depois

- Confirmado, o certificado leva o selo **Conferido** e aparece "Certificado conferido. Ele já entra na soma de horas."
- O quadro **Horas conferidas** soma só o que você conferiu e mostra as horas por tipo. Os que esperam conferência aparecem como "esperando a sua conferência".
- Depois de confirmado, você ainda pode corrigir os campos e clicar em **Salvar alterações**.
- Para tirar um certificado da lista, clique em **Excluir certificado** e confirme.
- Para filtrar, use **Buscar**, **Tipo** e **Situação** e clique em **Filtrar**. **Grade** e **Lista** mudam a visualização.

## Se der errado

- **"A leitura automática não está disponível agora. Preencha os campos à mão."** ou **"A leitura automática está pausada pela equipe. Preencha os campos à mão."**: preencha os campos e confirme.
- **"Para o Cognuss ler o certificado com IA, autorize a leitura dos seus materiais em Privacidade. Enquanto isso, preencha os campos à mão."**: ligue a autorização em Privacidade, se quiser, ou preencha à mão.
- **"Não parece um certificado ou comprovante. Confira o arquivo e preencha os campos à mão."**: confira se enviou o arquivo certo.
- **"O nome no certificado (…) não é o do seu cadastro. Confira antes de confirmar."**: confira se o certificado é seu.
- **"O arquivo foi recusado: …"**: o motivo vem depois dos dois pontos (antivírus, arquivo danificado ou tipo diferente do esperado). Envie outro arquivo.
- **"Carga horária inválida. Use, por exemplo, "20", "4h30" ou "90 min"."**: reescreva a carga horária.
- **"Informe o nome da atividade antes de confirmar."**: preencha **Nome da atividade**.
- **"O certificado ainda está sendo lido. Espere um pouco."**: espere a leitura terminar.

## Veja também

- [Como organizar certificados em pastas](organizar-certificados.md)
- [Como ligar e desligar as autorizações de IA](gerenciar-autorizacoes-de-ia.md)
- [Como ligar e desligar funcionalidades (admin)](../admin/ligar-e-desligar-funcionalidades.md)
- [Como configurar os recursos de IA (admin)](../admin/configurar-recursos-de-ia.md)
- [Como autorizar a leitura dos materiais pela IA](autorizar-leitura-por-ia.md)

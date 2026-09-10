# Halter 3D — FacilityGym

## Asset e licença

Não existia GLB/GLTF no checkout. A pesquisa por halteres hexagonais não forneceu um download adequado com licença e origem verificáveis para incorporação. Nenhum modelo externo foi incorporado.

O modelo procedural de `dist/halter-3d.js` foi criado para este projeto. Three.js 0.180.0 foi obtido da distribuição npm via jsDelivr; a licença MIT integral está em `dist/vendor/THREE-LICENSE.txt`. Os módulos são servidos localmente.

## Integração

A trajetória GSAP existente agora anima um estado numérico (posição em pixels, escala, rotação em graus, profundidade, opacidade). O adaptador usa uma câmera ortográfica para converter esse estado em `model.position`, `model.rotation` e `model.scale`. O canvas não recebe transforms ou blur CSS. O CSS anterior continua disponível como fallback animado.

`createHexDumbbell()` é o ponto de substituição por um futuro GLB licenciado. A fábrica deve retornar um Group centrado, com maior eixo em X, `userData.materials` e `userData.dispose()`. A largura é medida automaticamente para preservar a trajetória.

O primeiro frame WebGL precisa renderizar antes do crossfade. Erros de importação, contexto, shader ou orçamento móvel restauram o fallback. No mobile com falha, ele fica estático no hero e sai com a página.

Há uma cena, câmera, renderer e modelo. Renderização sob demanda, sem rotação automática, pixel ratio máximo 1.5 (1 no mobile), resize com debounce de 150ms. O canvas é desconectado após Acessórios; nenhum frame é agendado nessa etapa ou com a aba oculta. Ao voltar na rolagem, a mesma instância é reaproveitada. Ao trocar de breakpoint/preferência, os recursos são descartados.

`prefers-reduced-motion` usa apenas a composição estática no hero e o fade de carregamento. Mouse só funciona no hero, até começar a rolagem, limitado a 4 graus por eixo.

## Verificações e limites

- Importação real do módulo Three.js em Node: revisão 180.
- Modelo: cinco meshes, 568 triângulos, comprimento 3.60, cabeça aproximadamente 1.01 e profundidade 0.40.
- Teste de limites 3D: margem mínima do header e crop intencional verificados numericamente para 1440×1000, 1440×400, 768×1024 e 390×844, incluindo uma posição propositalmente incorreta.
- Falha simulada de WebGL: fallback restaurado, sem montagem de canvas.
- HTML e seções protegidas preservados em relação ao início desta rodada.
- Sintaxe e caminhos dos módulos verificados.

Esses testes não confirmam shaders, aparência, overflow DOM ou FPS em GPU real. O preview supervisionado disponível não suporta este projeto estático sem package.json. A validação em navegador permanece pendente. Use servidor HTTP local para validar os módulos ES; em file:// o navegador pode bloquear imports e manter o fallback.

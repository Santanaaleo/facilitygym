# Halter GLB — FacilityGym

## Asset e carregamento

`dist/assets/facilitygym_dumbbell.glb` é uma cópia binária integral do arquivo enviado pelo usuário (`facilitygym_dumbbell(1).glb`): 212.304 bytes, 3.144 triângulos. Não houve edição, simplificação, reconstrução ou inversão da geometria.

O módulo carrega o arquivo por `fetch` cancelável e passa o ArrayBuffer ao `GLTFLoader.parseAsync`. Loader e BufferGeometryUtils são da versão Three.js 0.180.0, com apenas imports adaptados para arquivos locais. A licença MIT está em `dist/vendor/THREE-LICENSE.txt`.

`Dumbbell_Root` é o próprio ator transformável. Antes de usá-lo, a implementação exige as seis peças (`Dumbbell_Bar`, `Dumbbell_Grip`, duas cabeças e dois anéis) e os quatro materiais esperados. Erro HTTP, GLB inválido ou peça/material ausente mantém o fallback CSS.

## Normalização e câmera

A largura original medida é 5,066817522 unidades. Escala uniforme durante a narrativa:

`larguraDoAtorEmPixels / 5.066817522 × escalaGSAP × escalaDaEntrada`

O centro local `(1.002663612, 1.290904880, -3.877266884)` é compensado na posição do root depois de aplicar rotação/escala. Os buffers, transforms dos filhos e proporções não são alterados. Os eixos continuam X=comprimento, Y=vertical, Z=profundidade.

Foi mantida a câmera ortográfica: posição Z=1000, near=0.1, far=3000 e limites correspondentes à viewport em pixels. Não foi possível verificar uma melhoria visual de perspectiva; preservar essa câmera mantém o mapeamento exato da trajetória e do pouso.

A pose base é X=0.16 rad (~9,2°), Y=0.28 rad (~16°), além do giro Z já existente. No meio de Equipamentos, há inclinação adicional X=7° e oscilação Y=35°, ambas voltando a zero no fim do clímax. O novo ponto intermediário mantém a interpolação original de posição, escala e giro Z. Esses acréscimos não são aplicados no mobile/reduced motion.

O hero foi deslocado levemente para dentro: X=viewport−0.98×largura; Y=altura−0.8×alturaDoAtor no desktop e −0.76 no mobile, com a margem mínima de 24px abaixo do header preservada. Outras etapas e ScrollTriggers não foram recriados.

## Materiais e luz

Cores e identidade dos quatro materiais originais preservadas. Borracha com roughness 0.78; anéis com roughness 0.34. Barra mantém ~0.92 de metalness e 0.4 de roughness; grip mantém 0.75/0.5 e recebe apenas uma microtextura bump 64×64, sem nova geometria. Emissive permanece preto.

Key branca lateral superior: intensidade 4; fill branca: 0.5; rim branca discreta: 0.65; ambiente: 0.12. Sem bloom, glow, pós-processamento ou luz colorida.

## Fallback e recursos

`createHexDumbbell()` e seus construtores de geometria foram removidos. O único modelo adicionado à cena é o root carregado do GLB.

Após o primeiro frame renderizado com opacidade visível, crossfade de 0.65s. No fim, `display:none` é aplicado ao fallback. Falhas reais restauram display/opacidade; desmontar a integração para mudança de breakpoint também limpa esse estado antes da próxima configuração.

Uma cena, câmera, renderer e canvas; pixel ratio máximo 1.5 (1 no mobile), resize com debounce de 150ms e renderização sob demanda. Canvas desconectado e renderização pausada após Acessórios. Importação tardia, cancelamento durante carregamento e perda de contexto são tratados. Reduced motion mantém composição estática e fade simples.

## Verificações executadas

- GLB servido por HTTP local e carregado pelo GLTFLoader real em Node.
- Root, seis meshes, quatro materiais e 3.144 triângulos confirmados.
- Buffers geométricos idênticos antes/depois da preparação; arquivo idêntico ao anexo.
- Teste numérico em 1440×1000, 768×1024 e 390×844: caixa projetada do hero ~76.1%, 77.7% e 77.7% visível, respectivamente; abaixo do header.
- Poses de Manifesto, Equipamentos e Acessórios avaliadas, com escala uniforme e todas as peças presentes.
- Sintaxe, imports locais e `git diff --check` verificados; HTML, CSS e loja intactos.

Limitação: o preview supervisionado disponível rejeita este projeto estático sem package.json. Não foram confirmados em navegador: aparência dos materiais, canvas visível, conclusão visual do crossfade, overflow DOM, console ou FPS/GPU. Os números de enquadramento são testes de geometria, não screenshots nem medição de pixels renderizados. Não houve commit/push.

Haz en javascript + html + css un juego para practicar música.
Utilizaremos teclado numérico en mano derecha y en mano izquierda letras para su control.
Empezaremos con un minijuego para practicar dictados. Sonará una nota , daremos un tiempo y se tendrá que identificar. Se irá complicando el juego a medida q mejore el usuario

## Cómo jugar

Abre `index.html` en el navegador (o ejecuta `npm start` y entra en http://localhost:8000).

### Mano derecha: teclado numérico

| Tecla | 1  | 2  | 3  | 4  | 5   | 6  | 7  | 8   |
|-------|----|----|----|----|-----|----|----|-----|
| Nota  | Do | Re | Mi | Fa | Sol | La | Si | Do' |

También funcionan los números de la fila superior del teclado.

### Mano izquierda: letras

| Tecla | Acción |
|-------|--------|
| `D` / `Intro` | Empezar o continuar |
| `A` | Repetir la nota (resta puntos) |
| `S` | Volver a oír la referencia (Do) |
| `Q` | Bemol ♭ para la siguiente nota (Q + 2 = Re♭) |
| `W` | Sostenido ♯ para la siguiente nota (W + 1 = Do♯) |
| `F` / `Esc` | Pausa |

### Progresión

Suena un Do de referencia y después la nota que hay que adivinar antes de que se vacíe la barra de tiempo.
Con 6 aciertos seguidos subes de nivel y con 3 fallos seguidos bajas uno:

1. Do y Sol
2. Tríada Do · Mi · Sol
3. Pentacordo Do → Sol
4. Escala de Do
5. Escala + Do agudo
6. Escala veloz (menos tiempo)
7. Sostenidos y bemoles
8. Cromática veloz

Los puntos dependen del nivel y de lo rápido que respondas. El nivel y el récord se guardan en el navegador.

## Estructura

- `index.html`: interfaz
- `css/styles.css`: estilos (incluye modo oscuro y diseño adaptable)
- `js/logic.js`: lógica pura (niveles, puntuación, teclas a notas)
- `js/audio.js`: síntesis de notas con Web Audio API
- `js/game.js`: flujo del juego, teclado y DOM
- `test/logic.test.js`: tests (`npm test`)

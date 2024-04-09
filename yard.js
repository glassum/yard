const MaxQ = 30;
const MaxR = 70;
const MaxX = 1024;
const MaxY = 768;
const MinVectorToMove = 30;
const MaxDelta = 0.5;
let balls;
let context;
let isPaused = false;
let isModal = false;
let currentId = null, currentDx = null, currentDy = null;

let seed = 2; // 1; // 8; // 6;
function random() {
    let x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

// Для сравнения "больше/меньше" корни извлекать необязательно
const ballIntersect = (x1, y1, r1, x2, y2, r2) => (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2) < (r1 + r2) * (r1 + r2);
const deltaCheck = delta => {
    delta = delta > MaxDelta ? MaxDelta : delta;
    delta = delta < -MaxDelta ? -MaxDelta : delta;
    return delta;
}

function draw({id, dx, dy}) {
    clear();
    balls.map(a => {
        // context.fillStyle = "#777";
        context.fillStyle = "rgb(" + a.colorR + "," + a.colorG + "," + a.colorB + ")";
        context.beginPath();
        context.arc(a.x, a.y, a.r, 0, 2 * Math.PI);
        context.fill();
        context.fillStyle = "#000";
        context.fillText(a.id, a.x - 5, a.y + 3,)
    });
    if (id != null & !isModal && (Math.abs(currentDx) > MinVectorToMove || Math.abs(currentDy) > MinVectorToMove)) { // Если дополнительные параметры присутствуют, рисуем вектор движения
        context.lineWidth = 3;

        context.beginPath();
        context.moveTo(balls[id].x, balls[id].y);
        context.lineTo(balls[id].x + dx * 2, balls[id].y + dy * 2);
        context.strokeStyle = "#555";
        context.stroke();

        context.beginPath();
        context.moveTo(balls[id].x + dx * 2, balls[id].y + dy * 2);
        context.lineTo(balls[id].x + dx * 2.1, balls[id].y + dy * 2.1);
        context.strokeStyle = "#FFF";
        context.stroke();
    }
}

function init() {
    balls = [];
    let id = 0;
    for (let i = 0; i < MaxQ; i++) {
        let colorR = 128 + Math.trunc(128 * random());
        let colorG = 128 + Math.trunc(128 * random());
        let colorB = 128 + Math.trunc(128 * random());
        let dx = random() * MaxDelta - MaxDelta / 2;
        let dy = random() * MaxDelta - MaxDelta / 2;
        let fitsWell = true;
        let x, y, r;
        for (let attempt = 100; attempt-- > 0;) {
            x = MaxR + Math.trunc((MaxX - MaxR * 2) * random());
            y = MaxR + Math.trunc((MaxY - MaxR * 2) * random());
            r = 20 + Math.trunc((MaxR - 20) * random());
            fitsWell = !balls.some(a => ballIntersect(x, y, r, a.x, a.y, a.r));
            if (fitsWell) break;
        }
        if (fitsWell) balls.push({id: id++, x, y, r, dx, dy, colorR, colorG, colorB});
    }
    draw({});
    console.log(balls);
}

function iterate() {
    let deltas = balls.map(a => ({dx: a.dx, dy: a.dy})); // Массив новых скоростей
    balls.map(a => balls
        .filter(b => a.id !== b.id) // Попарно сравниваем каждый шар с остальными, не сравнивая с самим собой
        .map(b => {
            if (ballIntersect(a.x, a.y, a.r, b.x, b.y, b.r)) { // Физика не точна, но вполне работает
                // Длина отрезка, соединяющего соприкасающиеся окружности (он же гипотенуза)
                let d = Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
                let px = (a.x - b.x) / d; // Катеты по осям X и Y
                let py = (a.y - b.y) / d;
                deltas[a.id].dx += 0.01 * MaxR * px / a.r; // Столкновения упругие, учитываем только радиус круга, а не массу шара, упрощая модель
                deltas[a.id].dy += 0.01 * MaxR * py / a.r;
            }
        }));

    balls.map((a, id) => { // Изменяем координаты, с учётом новых скоростей
        a.dx = deltaCheck(0.9993 * deltas[id].dx); // Имитируем потери на трение
        a.dy = deltaCheck(0.9993 * deltas[id].dy);
        if (a.x - a.r <= 0 || a.x + a.r >= MaxX) a.dx = -a.dx; // Столкновения с бортами
        if (a.y - a.r <= 0 || a.y + a.r >= MaxY) a.dy = -a.dy;
        a.x += a.dx;
        a.y += a.dy;
    });
}

const stop = () => balls.map(a => [a.dx, a.dy] = [0, 0]);
const clear = () => context.clearRect(0, 0, MaxX, MaxY);

function dragElement(element) {
    document.getElementById(element.id).onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        e.preventDefault();
        let rect = e.target.getBoundingClientRect();
        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
        if (currentId == null) balls.map((a, i) => {
            if ((a.x - x) * (a.x - x) + (a.y - y) * (a.y - y) < a.r * a.r) currentId = i;
        });
        currentDx = 0;
        currentDy = 0;
    }

    function elementDrag(e) {
        if (currentId != null) {
            e.preventDefault();
            let rect = e.target.getBoundingClientRect();
            currentDx = e.clientX - rect.left - balls[currentId].x;
            currentDy = e.clientY - rect.top - balls[currentId].y;
        }
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
        if (currentId != null) {
            let dx = currentDx == null ? 0 : currentDx;
            let dy = currentDy == null ? 0 : currentDy;
            if (Math.abs(dx) < MinVectorToMove && Math.abs(dy) < MinVectorToMove) {
                dx = 0;
                dy = 0;
            }
            if (Math.abs(dx) < MinVectorToMove && Math.abs(dx) < MinVectorToMove) {
                isModal = true;
                document.getElementById("actionColor").click();
            }
            let max = Math.max(Math.abs(dx), Math.abs(dy));
            /*          if (max !== 0) { // Несложная нормализация вектора
                          dx = 2 * dx / max;
                          dy = 2 * dy / max;
                      }*/
            balls[currentId].dx = dx;
            balls[currentId].dy = dy;
        }
        if (!isModal) currentId = null;
    }
}

window.onload = () => {

    const canvas = document.querySelector("canvas");

    document.getElementById("actionPause").addEventListener("click", () => isPaused = !isPaused);
    document.getElementById("actionStop").addEventListener("click", () => stop());
    document.getElementById("actionRandom").addEventListener("click", () => {
          // document.getElementById("actionColor").click(); // Preact.addToDo();
          seed = Math.trunc(random() * 100);
          init();
          draw({});
      });

    let generation = 0;
    context = document.getElementById("canvas").getContext("2d");
    context.canvas.width = MaxX;
    context.canvas.height = MaxY;

    init();
    dragElement(document.getElementById("canvas"));
    let time = 0;

    const Function1 = async () => new Promise(res => setTimeout(() => res(), 5));

    const Function2 = async () => {
        do {
            let element = document.getElementById("actionPause")
            element.classList.remove("active");
            if (isPaused) element.classList.add("active");
            if (!isPaused) {
                iterate();
                if (generation++ % 5 === 0) draw({id: currentId, dx: currentDx, dy: currentDy});
            }
            let timeNew = new Date();
            document.getElementById("time").value = timeNew - time;
            document.getElementById("generation").value = generation;
            time = timeNew;
            await Function1();
        } while (true);
    }

    Function2();

}
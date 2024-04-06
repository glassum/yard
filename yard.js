const MaxQ = 20;
const MaxR = 100;
const MaxX = 1024;
const MaxY = 768;
const MaxDelta = 0.5;
let balls = []
let context;
let isPaused = false;
let currentId = null, currentDx = null, currentDy = null;

// Для сравнения "больше/меньше" корни извлекать необязательно
const ballIntersect = (x1, y1, r1, x2, y2, r2) => (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2) < (r1 + r2) * (r1 + r2);
const deltaCheck = delta => {
    delta = delta > MaxDelta ? MaxDelta : delta;
    delta = delta < -MaxDelta ? -MaxDelta : delta;
    return delta;
}

let seed = 1; // 8; // 6;
function random() {
    let x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

function init() {
    let id = 0;
    for (let i = 0; i < MaxQ; i++) {
        let x, y, r, dx, dy;
        dx = random() * MaxDelta - MaxDelta / 2;
        dy = random() * MaxDelta - MaxDelta / 2;
        let fitsWell = true;
        for (let attempt = 500; attempt-- > 0;) {
            x = MaxR + Math.trunc((MaxX - MaxR * 2) * random());
            y = MaxR + Math.trunc((MaxY - MaxR * 2) * random());
            r = 20 + Math.trunc((MaxR - 20) * random());
            fitsWell = !balls.some(a => ballIntersect(x, y, r, a.x, a.y, a.r));
            if (fitsWell) break;
        }
        if (fitsWell) balls.push({id: id++, x, y, r, dx, dy});
    }
    draw({});
    console.log(balls);
}

function iterate() {
    let deltas = balls.map(a => ({dx: a.dx, dy: a.dy})); // Массив новых скоростей
    balls.map(a =>
        balls
            .filter(b => a.id !== b.id) // Попарно сравниваем каждый шар с остальными, не сравнивая с самим собой
            .map(b => {
                if (ballIntersect(a.x, a.y, a.r, b.x, b.y, b.r)) { // Физика не точна, но вполне работает
                    // Длина отрезка, соединяющего соприкасающиеся окружности (он же гипотенуза)
                    let d = Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
                    let px = (a.x - b.x) / d; // Катеты по осям X и Y
                    let py = (a.y - b.y) / d;
                    deltas[a.id].dx += 0.7 * px / a.r; // Столкновения упругие, c потерями, косвенно учитываем массу, привязываясь к радиусу
                    deltas[a.id].dy += 0.7 * py / a.r;
                }
            }));

    balls.map((a, id) => { // Изменяем координаты, с учётом новых скоростей
        a.dx = deltaCheck(0.9997 * deltas[id].dx); // Имитируем потери на трение
        a.dy = deltaCheck(0.9997 * deltas[id].dy);
        if (a.x - a.r <= 0 || a.x + a.r >= MaxX) a.dx = -a.dx; // Столкновения с бортами
        if (a.y - a.r <= 0 || a.y + a.r >= MaxY) a.dy = -a.dy;
        a.x += a.dx;
        a.y += a.dy;
    });
}

function draw({id, dx, dy}) {
    balls.map(a => {
        context.fillStyle = 'hsl(' + (360 * a.id / MaxQ) + ', 70%, 80%)'; // '#084';
        context.beginPath();
        context.arc(a.x, a.y, a.r, 0, 2 * Math.PI);
        context.fill();
        context.fillStyle = "#000";
        context.fillText(a.id, a.x - 5, a.y + 3,)
    });
    if (id != null) { // Если дополнительные параметры присутствуют, рисуем вектор удара
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
        if (currentId != null) {
            let max = Math.max(Math.abs(currentDx), Math.abs(currentDy)); // Несложная нормализация вектора
            balls[currentId].dx = currentDx / max * 2;
            balls[currentId].dy = currentDy / max * 2;
            console.log(currentId, currentDx, currentDy, max);
        }
        currentId = null;
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

window.onload = () => {

    const canvas = document.querySelector("canvas");

    document.getElementById("pause").addEventListener("click", function () {
        isPaused = !isPaused;
    });

    document.getElementById("stop").addEventListener("click", function () {
        stop();
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
            let element = document.getElementById("pause")
            element.classList.remove("active");
            if (isPaused) element.classList.add("active");
            if (!isPaused) {
                iterate();
                if (generation++ % 5 === 0) {
                    clear();
                    draw({id: currentId, dx: currentDx, dy: currentDy});
                }
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
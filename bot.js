const mineflayer = require('mineflayer');

const CONFIG = {
    host: 'tuntun2.aternos.me',
    port: 29306,
    username: 'tung',
    password: '',            // si el servidor pide /login, ponla aquí
    version: 1.21.4,          // autodetecta; si falla, pon por ejemplo '1.21.4'
    reconnectDelay: 30000
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function createBot() {
    const options = {
        host: CONFIG.host,
        port: CONFIG.port,
        username: CONFIG.username,
        auth: 'offline'
    };
    if (CONFIG.version) options.version = CONFIG.version;

    const bot = mineflayer.createBot(options);

    let routineInterval = null;
    let reconnecting = false;
    let busy = false;

    bot.once('login', () => {
        console.log('[NPC] Conexión establecida con el servidor.');
    });

    bot.once('spawn', () => {
        console.log('[NPC] El bot ha aparecido en el mapa.');

        if (CONFIG.password) {
            setTimeout(() => bot.chat(`/login ${CONFIG.password}`), 4000);
        }

        routineInterval = setInterval(runRoutine, 45000);
    });

    async function runRoutine() {
        if (busy || !bot.entity) return;
        busy = true;

        try {
            const ids = ['chest', 'trapped_chest', 'barrel']
                .map(n => bot.registry.blocksByName[n]?.id)
                .filter(id => id !== undefined);

            const block = bot.findBlock({ matching: ids, maxDistance: 5 });

            if (block) {
                console.log('[NPC] Abriendo contenedor...');
                const container = await bot.openContainer(block);
                await sleep(2000);
                container.close();
                console.log('[NPC] Contenedor cerrado.');
            } else {
                console.log('[NPC] No hay contenedor cerca.');
            }

            await sleep(1000);
            bot.setControlState('jump', true);
            await sleep(500);
            bot.setControlState('jump', false);
            console.log('[NPC] Anti-AFK completado.');
        } catch (err) {
            console.log(`[NPC] Error en el ciclo: ${err.message}`);
        } finally {
            busy = false;
        }
    }

    function reconnect(reason) {
        if (reconnecting) return;
        reconnecting = true;

        clearInterval(routineInterval);
        try { bot.end(); } catch {}

        console.log(`[NPC] Desconectado (${reason}). Reintentando en ${CONFIG.reconnectDelay / 1000}s...`);
        setTimeout(createBot, CONFIG.reconnectDelay);
    }

    bot.on('kicked', (reason) => console.log('[NPC] Expulsado:', JSON.stringify(reason)));

    bot.on('error', (err) => {
        console.log(`[NPC] Error: ${err.message}`);
        // Si falla antes de entrar (servidor apagado, versión no soportada...), 'end' puede no dispararse
        if (!bot.entity) reconnect(err.code || err.message);
    });

    bot.on('end', reconnect);
}

createBot();

import * as THREE from 'three'
import './style.css'
import Experience from './Experience/Experience.js'

const experience = new Experience({
    targetElement: document.querySelector('.experience')
})

// Scroll-driven sphere spin (supports vertical, horizontal & diagonal trackpad)
experience.scrollVelocityY = 0
experience.scrollVelocityX = 0
window.addEventListener('wheel', (_e) =>
{
    experience.scrollVelocityY += _e.deltaY * -0.0001
    experience.scrollVelocityX += _e.deltaX * 0.0001
}, { passive: true })

const loaderCircle = document.querySelector('.loader-circle')
const loaderPercent = document.querySelector('.loader-percent')
const ukTimeValueEl = document.querySelector('.uk-time-value')

const ukTimeTzFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    timeZoneName: 'short'
})

const ukTimeHMFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
})

const tickUkTime = () =>
{
    if(ukTimeValueEl)
    {
        const now = new Date()
        const tzParts = ukTimeTzFormatter.formatToParts(now)
        const tzName = (tzParts.find((_p) => _p.type === 'timeZoneName') || {}).value || 'GMT'
        const rawTime = ukTimeHMFormatter.format(now)
        const formatted = rawTime
            .replace(/\bam\b/i, 'a.m.')
            .replace(/\bpm\b/i, 'p.m.')
        ukTimeValueEl.textContent = `${tzName} ${formatted}`
    }
    window.setTimeout(tickUkTime, 1000 - (Date.now() % 1000))
}

tickUkTime()
const calloutMap = {
    tl: { card: document.querySelector('[data-callout="tl"]') },
    tr: { card: document.querySelector('[data-callout="tr"]') },
    bl: { card: document.querySelector('[data-callout="bl"]') },
    br: { card: document.querySelector('[data-callout="br"]') }
}
const calloutRevealOrder = ['tl', 'tr', 'br', 'bl']
const expandableCalloutKeys = ['tl', 'tr', 'bl', 'br']
const popupPageByKey = {
    tl: '/popup-pages/profile.html',
    tr: '/popup-pages/softwares.html',
    bl: '/popup-pages/pipelines.html',
    br: '/popup-pages/projects.html'
}
const popupPageCache = {}
let expandedCalloutKey = null

const updateLoader = (_progress) =>
{
    const safeProgress = Math.max(0, Math.min(100, Math.round(_progress)))

    if(loaderCircle)
    {
        loaderCircle.style.setProperty('--progress', safeProgress)
        loaderCircle.setAttribute('aria-valuenow', `${safeProgress}`)
    }

    if(loaderPercent)
    {
        loaderPercent.textContent = `${safeProgress}%`
    }
}

const revealCalloutsClockwise = () =>
{
    for(const key in calloutMap)
    {
        const entry = calloutMap[key]
        if(entry.card)
        {
            entry.card.classList.remove('is-visible')
        }
    }

    calloutRevealOrder.forEach((key, index) =>
    {
        const entry = calloutMap[key]
        if(entry)
        {
            window.setTimeout(() =>
            {
                if(entry.card)
                {
                    entry.card.classList.add('is-visible')
                }
            }, index * 360)
        }
    })
}

const setBackgroundAutoRotate = (_enabled) =>
{
    const controls = experience.camera && experience.camera.modes && experience.camera.modes.debug
        ? experience.camera.modes.debug.orbitControls
        : null

    if(!controls)
    {
        return
    }

    controls.enabled = true
    controls.autoRotate = _enabled
    controls.autoRotateSpeed = _enabled ? 0.18 : 0
}

const loadPopupPage = async (_key) =>
{
    const path = popupPageByKey[_key]
    if(!path)
    {
        return null
    }

    if(popupPageCache[path])
    {
        return popupPageCache[path]
    }

    const response = await fetch(path, { cache: 'no-cache' })
    if(!response.ok)
    {
        throw new Error(`Failed to load ${path}`)
    }

    const html = await response.text()
    popupPageCache[path] = html
    return html
}

const closeExpandedCallout = () =>
{
    if(!expandedCalloutKey)
    {
        return
    }

    const activeEntry = calloutMap[expandedCalloutKey]
    if(activeEntry && activeEntry.card)
    {
        activeEntry.card.classList.remove('is-expanded')
        if(activeEntry.collapsedHTML !== undefined)
        {
            activeEntry.card.innerHTML = activeEntry.collapsedHTML
        }
    }

    expandedCalloutKey = null
    document.body.classList.remove('panel-open')
    document.body.classList.remove('panel-open-tl')
    document.body.classList.remove('panel-open-tr')
    document.body.classList.remove('panel-open-bl')
    document.body.classList.remove('panel-open-br')
    setBackgroundAutoRotate(false)
}

const openExpandedCallout = async (_key) =>
{
    const entry = calloutMap[_key]
    if(!entry || !entry.card)
    {
        return
    }

    if(expandedCalloutKey === _key)
    {
        closeExpandedCallout()
        return
    }

    if(expandedCalloutKey)
    {
        closeExpandedCallout()
    }

    const bounds = entry.card.getBoundingClientRect()
    entry.card.style.setProperty('--expand-left', `${bounds.left}px`)
    entry.card.style.setProperty('--expand-top', `${bounds.top}px`)
    entry.card.style.setProperty('--expand-width', `${bounds.width}px`)
    entry.card.style.setProperty('--expand-height', `${bounds.height}px`)

    expandedCalloutKey = _key
    entry.card.classList.add('is-expanded')
    document.body.classList.add('panel-open')
    document.body.classList.remove('panel-open-tl')
    document.body.classList.remove('panel-open-tr')
    document.body.classList.remove('panel-open-bl')
    document.body.classList.remove('panel-open-br')
    document.body.classList.add(`panel-open-${_key}`)
    setBackgroundAutoRotate(true)

    if(entry.collapsedHTML === undefined)
    {
        entry.collapsedHTML = entry.card.innerHTML
    }

    entry.card.innerHTML = '<div class="popup-page popup-page-loading">Loading...</div>'

    try
    {
        const pageHtml = await loadPopupPage(_key)
        if(expandedCalloutKey === _key && pageHtml)
        {
            entry.card.innerHTML = `<div class="popup-page">${pageHtml}</div>`

            // innerHTML does not execute <script> tags — re-run them manually
            entry.card.querySelectorAll('script').forEach((oldScript) =>
            {
                const newScript = document.createElement('script')
                Array.from(oldScript.attributes).forEach((attr) =>
                {
                    newScript.setAttribute(attr.name, attr.value)
                })
                newScript.textContent = oldScript.textContent
                oldScript.parentNode.replaceChild(newScript, oldScript)
            })
        }
    }
    catch(error)
    {
        if(expandedCalloutKey === _key)
        {
            entry.card.innerHTML = '<div class="popup-page popup-page-loading">Could not load page content.</div>'
        }
    }
}

expandableCalloutKeys.forEach((_key) =>
{
    const entry = calloutMap[_key]
    if(!entry || !entry.card)
    {
        return
    }

    entry.card.addEventListener('click', () =>
    {
        if(entry.card.classList.contains('is-expanded'))
        {
            return
        }
        if(!entry.card.classList.contains('is-visible'))
        {
            return
        }
        void openExpandedCallout(_key)
    })

    entry.card.addEventListener('keydown', (_event) =>
    {
        if(_event.key === 'Enter' || _event.key === ' ')
        {
            _event.preventDefault()
            void openExpandedCallout(_key)
        }
    })
})

const menuKeyMap = { profile: 'tl', softwares: 'tr', pipelines: 'bl', projects: 'br' }

document.querySelectorAll('.side-menu [data-menu]').forEach((_btn) =>
{
    _btn.addEventListener('click', () =>
    {
        const key = menuKeyMap[_btn.dataset.menu] || _btn.dataset.menu
        void openExpandedCallout(key)
        _btn.blur()
    })
})

const panelCloseBtn = document.querySelector('.panel-close')
if(panelCloseBtn)
{
    panelCloseBtn.addEventListener('click', closeExpandedCallout)
}

window.addEventListener('keydown', (_event) =>
{
    if(_event.key === 'Escape')
    {
        closeExpandedCallout()
    }
})

updateLoader(0)

let displayedProgress = 0
let targetProgress = 0
let resourcesReady = false
let launchStarted = false
const minLoaderDuration = 1400
const loaderStartTime = performance.now()

const smoothLoaderTick = () =>
{
    const delta = targetProgress - displayedProgress
    displayedProgress += delta * 0.12

    if(Math.abs(delta) < 0.03)
    {
        displayedProgress = targetProgress
    }

    updateLoader(displayedProgress)

    const elapsed = performance.now() - loaderStartTime
    const canLaunch = resourcesReady && elapsed >= minLoaderDuration && displayedProgress >= 99.7

    if(canLaunch && !launchStarted)
    {
        launchStarted = true
        displayedProgress = 100
        updateLoader(100)
        window.setTimeout(() =>
        {
            document.body.classList.add('is-loaded')
            revealCalloutsClockwise()
            // Once all intro animations finish, switch to instant transitions
            window.setTimeout(() =>
            {
                document.body.classList.add('hero-animated')
            }, 4200)
        }, 220)
        return
    }

    window.requestAnimationFrame(smoothLoaderTick)
}

window.requestAnimationFrame(smoothLoaderTick)

if(experience.resources)
{
    experience.resources.on('progress', (_group) =>
    {
        const progress = (_group.loaded / _group.toLoad) * 100
        targetProgress = Math.max(targetProgress, progress)
    })

    experience.resources.on('end', () =>
    {
        targetProgress = 100
        resourcesReady = true
    })
}

// ─── 3D Spinning Antibody (IgG) ──────────────────────────────────────────────
;(() =>
{
    const abCanvas = document.getElementById('antibody-canvas')
    if(!abCanvas) return

    const W = 70, H = 80

    const abRenderer = new THREE.WebGLRenderer({ canvas: abCanvas, alpha: true, antialias: true })
    abRenderer.setSize(W, H)
    abRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    const abScene = new THREE.Scene()
    const abCamera = new THREE.PerspectiveCamera(38, W / H, 0.1, 50)
    abCamera.position.set(0, 0, 6)

    // Lighting — soft white key + gentle fill + cool rim
    abScene.add(new THREE.AmbientLight(0x888899, 1.2))
    const dl1 = new THREE.DirectionalLight(0xffffff, 2.4)
    dl1.position.set(3, 5, 5)
    abScene.add(dl1)
    const dl2 = new THREE.DirectionalLight(0xaabbcc, 0.9)
    dl2.position.set(-3, -1, 3)
    abScene.add(dl2)
    const rim = new THREE.DirectionalLight(0xddeeff, 0.6)
    rim.position.set(0, 0, -5)
    abScene.add(rim)

    // Single white material for everything — subtle grey shading for depth
    const abMat = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        emissive: 0x222233,
        specular: 0xffffff,
        shininess: 120
    })

    const abGroup = new THREE.Group()
    abScene.add(abGroup)

    // All coordinates relative to the hinge/fork at y = 0.
    const SEG = 32   // radial segments — smooth round cross-section

    // Helper: rounded-end "capsule" built from CylinderGeometry + two SphereGeometry caps.
    // Both caps share the same material and radius, so the join is seamless.
    // totalLen = full end-to-end length (caps included).
    const makeCapsule = (r, totalLen, mat, parent, x, y, z) =>
    {
        const cylLen = Math.max(0, totalLen - 2 * r)
        const grp = new THREE.Group()
        grp.position.set(x, y, z)

        // Cylindrical body
        grp.add(Object.assign(
            new THREE.Mesh(new THREE.CylinderGeometry(r, r, cylLen, SEG), mat)
        ))
        // Top dome
        const top = new THREE.Mesh(new THREE.SphereGeometry(r, SEG, 16), mat)
        top.position.set(0, cylLen / 2, 0)
        grp.add(top)
        // Bottom dome
        const bot = new THREE.Mesh(new THREE.SphereGeometry(r, SEG, 16), mat)
        bot.position.set(0, -cylLen / 2, 0)
        grp.add(bot)

        parent.add(grp)
        return grp
    }

    // ── Fc region: TWO parallel heavy-chain tubes going straight down ────────
    const fcR   = 0.14
    const fcLen = 1.55
    const fcSep = 0.34
    ;[-1, 1].forEach(side =>
        makeCapsule(fcR, fcLen, abMat, abGroup, side * fcSep / 2, -fcLen / 2, 0)
    )

    // ── Fab arms: heavy-chain + light-chain capsule per side ─────────────────
    const fabR     = 0.16
    const fabLen   = 1.45
    const fabAngle = Math.PI / 4

    const lcR    = 0.11
    const lcLen  = 1.00
    const lcOffX = 0.38

    ;[-1, 1].forEach(side =>
    {
        const armGrp = new THREE.Group()
        armGrp.rotation.z = -side * fabAngle
        abGroup.add(armGrp)

        // Heavy-chain Fab — centred so it spans local y = 0 → +fabLen
        makeCapsule(fabR, fabLen, abMat, armGrp, 0, fabLen / 2, 0)

        // Light-chain — offset outward in arm's local X
        makeCapsule(lcR, lcLen, abMat, armGrp, side * lcOffX, lcLen / 2 + 0.15, 0)
    })

    // ── Centre the group vertically ──────────────────────────────────────────
    //   arm tips: fabLen * cos(45°) ≈ +1.03
    //   Fc base:  −fcLen            = −1.55
    //   midpoint: (1.03 − 1.55) / 2 ≈ −0.26
    abGroup.position.y = 0.26

    // ── Render loop ──────────────────────────────────────────────────────────
    const abAnimate = () =>
    {
        requestAnimationFrame(abAnimate)
        abGroup.rotation.y += 0.012
        abGroup.rotation.x = Math.sin(Date.now() * 0.0005) * 0.18
        abRenderer.render(abScene, abCamera)
    }
    abAnimate()
})()

// ─── Antibody Trail System ────────────────────────────────────────────────────
;(function trailSystem()
{
    const backCanvas  = document.getElementById('trail-back-canvas')
    const frontCanvas = document.getElementById('trail-front-canvas')
    if (!backCanvas || !frontCanvas) return

    // ── Bezier evaluation (normalised 0–1 screen coords) ──────────────────────
    function bez(p0, p1, p2, p3, t)
    {
        const u = 1 - t
        return {
            x: u*u*u*p0.x + 3*u*u*t*p1.x + 3*u*t*t*p2.x + t*t*t*p3.x,
            y: u*u*u*p0.y + 3*u*u*t*p1.y + 3*u*t*t*p2.y + t*t*t*p3.y
        }
    }

    // Normalised screen (0–1) → Three.js ortho world space
    function toOrtho(nx, ny, asp)
    {
        return { x: (nx - 0.5) * 2 * asp, y: -(ny - 0.5) * 2 }
    }

    // ── Path definitions (normalised screen coords) ────────────────────────────
    // Path 1: horizontal sweep left→right, behind sphere
    const PATH_H = [
        { x: -0.12, y: 0.30 },
        { x:  0.10, y: 0.68 },
        { x:  0.58, y: 0.78 },
        { x:  1.02, y: 0.88 }
    ]
    // Path 2: vertical sweep top-right→bottom-left, in front of sphere
    const PATH_V = [
        { x: 0.85, y: -0.02 },
        { x: 0.55, y:  0.63 },
        { x: 0.25, y:  0.91 },
        { x: 0.01, y:  1.02 }
    ]

    // ── Exact replica of the logo antibody (same capsule geometry + material) ──
    const SEG = 32

    // Shared material — opaque, matches logo exactly
    const trailMat = new THREE.MeshPhongMaterial({
        color:     0xffffff,
        emissive:  0x222233,
        specular:  0xffffff,
        shininess: 120
    })

    function makeCapsule(r, totalLen, parent, x, y, z)
    {
        const cylLen = Math.max(0, totalLen - 2 * r)
        const grp    = new THREE.Group()
        grp.position.set(x, y, z)
        grp.add(new THREE.Mesh(new THREE.CylinderGeometry(r, r, cylLen, SEG), trailMat))
        const top = new THREE.Mesh(new THREE.SphereGeometry(r, SEG, 16), trailMat)
        top.position.set(0, cylLen / 2, 0)
        grp.add(top)
        const bot = new THREE.Mesh(new THREE.SphereGeometry(r, SEG, 16), trailMat)
        bot.position.set(0, -cylLen / 2, 0)
        grp.add(bot)
        parent.add(grp)
        return grp
    }

    function buildAntibody()
    {
        const g = new THREE.Group()

        // Fc region — two parallel capsules (identical to logo)
        const fcR = 0.22, fcLen = 1.55, fcSep = 0.34
        ;[-1, 1].forEach(side =>
            makeCapsule(fcR, fcLen, g, side * fcSep / 2, -fcLen / 2, 0)
        )

        // Fab arms — heavy-chain + light-chain per side (identical to logo)
        const fabR = 0.24, fabLen = 1.45, fabAngle = Math.PI / 4
        const lcR  = 0.18, lcLen  = 1.00, lcOffX   = 0.38

        ;[-1, 1].forEach(side =>
        {
            const armGrp = new THREE.Group()
            armGrp.rotation.z = -side * fabAngle
            g.add(armGrp)
            makeCapsule(fabR, fabLen, armGrp,               0, fabLen / 2,        0)
            makeCapsule(lcR,  lcLen,  armGrp, side * lcOffX, lcLen  / 2 + 0.15, 0)
        })

        g.position.y = 0.26   // same vertical centring as logo
        return g
    }

    // ── Scene builder ──────────────────────────────────────────────────────────
    // Logo is rendered in 70×80 px with PerspectiveCamera(38°) at z=6.
    // Half that size in the ortho trail = scale ≈ 0.065
    const BASE_SCALE = 0.0325

    // t-remapper: clusters antibodies toward the centre of the curve (denser middle, sparser ends)
    function tCenter(i, n) {
        const u = i / (n - 1)          // uniform 0→1
        const s = 2 * u - 1            // -1→1
        return 0.5 + 0.5 * Math.sign(s) * Math.pow(Math.abs(s), 1.35)
    }
    // identity spacing
    function tLinear(i, n) { return i / (n - 1) }

    function buildTrail(canvas, path, n, tMapper)
    {
        const asp = window.innerWidth / window.innerHeight

        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        renderer.setSize(window.innerWidth, window.innerHeight)
        renderer.setClearColor(0x000000, 0)

        const scene  = new THREE.Scene()
        const camera = new THREE.OrthographicCamera(-asp, asp, 1, -1, 0.1, 50)
        camera.position.z = 10

        // Same lighting rig as the logo
        scene.add(new THREE.AmbientLight(0x888899, 1.2))
        const dl1 = new THREE.DirectionalLight(0xffffff, 2.4)
        dl1.position.set(3, 5, 5)
        scene.add(dl1)
        const dl2 = new THREE.DirectionalLight(0xaabbcc, 0.9)
        dl2.position.set(-3, -1, 3)
        scene.add(dl2)
        const rim = new THREE.DirectionalLight(0xddeeff, 0.6)
        rim.position.set(0, 0, -5)
        scene.add(rim)

        const abs = []
        for (let i = 0; i < n; i++)
        {
            const t   = tMapper(i, n)
            const pos = bez(path[0], path[1], path[2], path[3], t)
            const op  = toOrtho(pos.x, pos.y, asp)

            const ab = buildAntibody()
            ab.position.set(op.x, op.y, 0)
            ab.scale.setScalar(BASE_SCALE + (Math.random() - 0.5) * 0.008)

            // random initial pointing direction on all three axes
            ab.rotation.set(
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2
            )
            // independent, signed spin rates — each axis can go either direction
            ab._rxRate = (Math.random() - 0.5) * 2.4    // −1.2 … +1.2 rad/s
            ab._ryRate = (Math.random() - 0.5) * 3.0    // −1.5 … +1.5 rad/s
            ab._rzRate = (Math.random() - 0.5) * 1.8    // −0.9 … +0.9 rad/s
            ab._t      = t   // base position on the curve (0–1)

            abs.push(ab)
            scene.add(ab)
        }

        return { renderer, scene, camera, abs, path, _flowOffset: 0 }
    }

    const trailBack  = buildTrail(backCanvas,  PATH_H, 16, tCenter)   // denser middle
    const trailFront = buildTrail(frontCanvas, PATH_V, 14, tLinear)  // 3 fewer, even spacing

    // ── Scroll-driven trail movement ──────────────────────────────────────────
    let _trailScrollVel = 0
    window.addEventListener('wheel', e =>
    {
        // scrollDown → positive vel → H trail moves right, V trail moves up
        _trailScrollVel += e.deltaY * 0.00018
    }, { passive: true })

    // ── Animation loop (starts/stops with panel-open) ─────────────────────────
    let running = false
    let rafId   = null

    function tick()
    {
        rafId = requestAnimationFrame(tick)

        // Decay scroll velocity (friction)
        _trailScrollVel *= 0.88

        // Advance flow offsets in opposite directions per trail
        trailBack._flowOffset  = ((trailBack._flowOffset  + _trailScrollVel)      % 1 + 1) % 1
        trailFront._flowOffset = ((trailFront._flowOffset - _trailScrollVel)      % 1 + 1) % 1

        const aspCur = window.innerWidth / window.innerHeight

        ;[trailBack, trailFront].forEach(trail =>
        {
            const { renderer, scene, camera, abs, path } = trail
            abs.forEach(ab =>
            {
                // Reposition along path based on scrolled offset
                const t  = ((ab._t + trail._flowOffset) % 1 + 1) % 1
                const pos = bez(path[0], path[1], path[2], path[3], t)
                const op  = toOrtho(pos.x, pos.y, aspCur)
                ab.position.set(op.x, op.y, 0)

                // Continue spinning
                ab.rotation.x += ab._rxRate * 0.016
                ab.rotation.y += ab._ryRate * 0.016
                ab.rotation.z += ab._rzRate * 0.016
            })
            renderer.render(scene, camera)
        })
    }

    function startTrails()
    {
        if (running) return
        running = true
        rafId = requestAnimationFrame(tick)
    }

    function stopTrails()
    {
        if (!running) return
        running = false
        cancelAnimationFrame(rafId)
    }

    // Watch body class for panel-open
    new MutationObserver(() =>
    {
        document.body.classList.contains('panel-open') ? startTrails() : stopTrails()
    }).observe(document.body, { attributes: true, attributeFilter: ['class'] })

    // Handle resize
    window.addEventListener('resize', () =>
    {
        ;[trailBack, trailFront].forEach(({ renderer, camera }) =>
        {
            const asp = window.innerWidth / window.innerHeight
            renderer.setSize(window.innerWidth, window.innerHeight)
            camera.left   = -asp
            camera.right  =  asp
            camera.updateProjectionMatrix()
        })
    })
})()

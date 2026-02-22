import * as THREE from 'three'
import './style.css'
import Experience from './Experience/Experience.js'

const experience = new Experience({
    targetElement: document.querySelector('.experience')
})

const loaderCircle = document.querySelector('.loader-circle')
const loaderPercent = document.querySelector('.loader-percent')
const ukTimeEl = document.querySelector('.uk-time')
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
const calloutSvg = document.querySelector('.callout-lines')
const calloutMap = {
    tl: {
        card: document.querySelector('[data-callout="tl"]'),
        line: document.querySelector('[data-line="tl"]'),
        node: document.querySelector('[data-node="tl"]'),
        lock: document.querySelector('[data-lock="tl"]'),
        anchorX: 1,
        anchorY: 0.5,
        startX: null,
        startY: null,
        targetX: null,
        targetY: null,
        sphereAnchor: new THREE.Vector3(-0.62, 0.48, 0.58).normalize()
    },
    tr: {
        card: document.querySelector('[data-callout="tr"]'),
        line: document.querySelector('[data-line="tr"]'),
        node: document.querySelector('[data-node="tr"]'),
        lock: document.querySelector('[data-lock="tr"]'),
        anchorX: 0,
        anchorY: 0.5,
        startX: null,
        startY: null,
        targetX: null,
        targetY: null,
        sphereAnchor: new THREE.Vector3(0.72, 0.41, 0.39).normalize()
    },
    bl: {
        card: document.querySelector('[data-callout="bl"]'),
        line: document.querySelector('[data-line="bl"]'),
        node: document.querySelector('[data-node="bl"]'),
        lock: document.querySelector('[data-lock="bl"]'),
        anchorX: 1,
        anchorY: 0.5,
        startX: null,
        startY: null,
        targetX: null,
        targetY: null,
        sphereAnchor: new THREE.Vector3(-0.55, -0.63, 0.42).normalize()
    },
    br: {
        card: document.querySelector('[data-callout="br"]'),
        line: document.querySelector('[data-line="br"]'),
        node: document.querySelector('[data-node="br"]'),
        lock: document.querySelector('[data-lock="br"]'),
        anchorX: 0,
        anchorY: 0.5,
        startX: null,
        startY: null,
        targetX: null,
        targetY: null,
        sphereAnchor: new THREE.Vector3(0.6, -0.57, 0.56).normalize()
    }
}
const calloutRevealOrder = ['tl', 'tr', 'br', 'bl']
const expandableCalloutKeys = ['tl', 'tr', 'bl', 'br']
const popupPageByKey = {
    tl: '/popup-pages/tl.html',
    tr: '/popup-pages/tr.html',
    bl: '/popup-pages/bl.html',
    br: '/popup-pages/br.html'
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
        if(entry.line)
        {
            entry.line.classList.remove('is-visible')
        }
        if(entry.node)
        {
            entry.node.classList.remove('is-visible')
        }
        if(entry.lock)
        {
            entry.lock.classList.remove('is-visible')
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
                if(entry.line)
                {
                    entry.line.classList.add('is-visible')
                }
                if(entry.node)
                {
                    entry.node.classList.add('is-visible')
                }
                if(entry.lock)
                {
                    entry.lock.classList.add('is-visible')
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

document.querySelectorAll('.side-menu [data-menu]').forEach((_btn) =>
{
    _btn.addEventListener('click', () =>
    {
        void openExpandedCallout(_btn.dataset.menu)
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
let sphereTargetsLocked = false
const sphereLineTargetRadius = 1.04
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
        }, 220)
        return
    }

    window.requestAnimationFrame(smoothLoaderTick)
}

window.requestAnimationFrame(smoothLoaderTick)

const cacheCalloutAnchors = () =>
{
    for(const key in calloutMap)
    {
        const entry = calloutMap[key]
        if(!entry.card)
        {
            continue
        }

        const rect = entry.card.getBoundingClientRect()
        entry.startX = rect.left + rect.width * entry.anchorX
        entry.startY = rect.top + rect.height * entry.anchorY
    }
}

const cacheSphereTargets = () =>
{
    const sphereMesh = experience.world && experience.world.sphere ? experience.world.sphere.mesh : null
    const camera = experience.camera ? experience.camera.instance : null
    sphereTargetsLocked = Boolean(sphereMesh && camera)

    for(const key in calloutMap)
    {
        const entry = calloutMap[key]
        entry.targetX = window.innerWidth * 0.5
        entry.targetY = window.innerHeight * 0.5

        if(sphereTargetsLocked)
        {
            const worldAnchor = entry.sphereAnchor.clone().multiplyScalar(sphereLineTargetRadius)
            sphereMesh.localToWorld(worldAnchor)
            const projectedPosition = worldAnchor.project(camera)
            entry.targetX = (projectedPosition.x * 0.5 + 0.5) * window.innerWidth
            entry.targetY = (-projectedPosition.y * 0.5 + 0.5) * window.innerHeight
        }
    }
}

window.addEventListener('resize', () =>
{
    cacheCalloutAnchors()
    cacheSphereTargets()
})

window.setTimeout(() =>
{
    cacheCalloutAnchors()
    cacheSphereTargets()
}, 50)

const updateCalloutLines = () =>
{
    if(!sphereTargetsLocked)
    {
        cacheSphereTargets()
    }

    if(calloutSvg)
    {
        calloutSvg.setAttribute('viewBox', `0 0 ${window.innerWidth} ${window.innerHeight}`)
    }

    for(const key in calloutMap)
    {
        const entry = calloutMap[key]
        if(!entry.card || !entry.line)
        {
            continue
        }

        const rect = entry.card.getBoundingClientRect()
        const startX = rect.left + rect.width * entry.anchorX
        const startY = rect.top + rect.height * entry.anchorY
        const targetX = entry.targetX !== null ? entry.targetX : window.innerWidth * 0.5
        const targetY = entry.targetY !== null ? entry.targetY : window.innerHeight * 0.5

        entry.line.setAttribute('x1', `${startX}`)
        entry.line.setAttribute('y1', `${startY}`)
        entry.line.setAttribute('x2', `${targetX}`)
        entry.line.setAttribute('y2', `${targetY}`)

        if(entry.node)
        {
            entry.node.setAttribute('cx', `${startX}`)
            entry.node.setAttribute('cy', `${startY}`)
        }

        if(entry.lock)
        {
            entry.lock.style.left = `${targetX}px`
            entry.lock.style.top = `${targetY}px`
        }
    }

    window.requestAnimationFrame(updateCalloutLines)
}

window.requestAnimationFrame(updateCalloutLines)

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

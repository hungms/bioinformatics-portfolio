import * as THREE from 'three'
import './style.css'
import Experience from './Experience/Experience.js'

const experience = new Experience({
    targetElement: document.querySelector('.experience')
})

const loaderCircle = document.querySelector('.loader-circle')
const loaderPercent = document.querySelector('.loader-percent')
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

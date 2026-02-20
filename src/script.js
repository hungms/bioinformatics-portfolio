import './style.css'
import Experience from './Experience/Experience.js'

const experience = new Experience({
    targetElement: document.querySelector('.experience')
})

const loaderCircle = document.querySelector('.loader-circle')
const loaderPercent = document.querySelector('.loader-percent')

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

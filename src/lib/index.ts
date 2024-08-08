import globby from 'globby'
import {exec as childProcessExec} from 'node:child_process'
import fs from 'node:fs'
import * as path from 'node:path'
import * as util from 'node:util'
import ora from 'ora'
import {zipObj} from 'ramda'
import getSize from 'size-limit'

import {IBundleCheckerParams, IBundleCheckerReport, IFileSizeReport} from '../../types/bundle-checker-types'
import {normalizeSlugsInFileNames} from './utils'
const exec = util.promisify(childProcessExec)
const {error} = console

export default class BundleChecker {
  private generateWorkDirName = () => `/tmp/bundler-checker/${Date.now()}`
  private inputParams: IBundleCheckerParams
  private originalCwd = ''
  private safeDeleteFolder = async (dir: string) => exec(`rm -Rf ${dir === '/' ? '' : dir}`)

  private spinner = ora(`Bundle checker`)

  private workDir = ''

  constructor(params: IBundleCheckerParams) {
    this.inputParams = params
    this.originalCwd = process.cwd()
  }

  public async compare(): Promise<IBundleCheckerReport> {
    let report: IBundleCheckerReport = {
      currentBranchReport: {},
      targetBranchReport: {},
    }
    const {currentBranch, targetBranch} = this.inputParams
    try {
      await this.init()
      // --- TARGET BRANCH
      this.spinner.indent = 4
      this.spinner.info(`Branch: ${targetBranch}`)
      await this.buildBranch(targetBranch)
      const targetBranchReport = normalizeSlugsInFileNames(await this.getSingleBranchReport())

      this.spinner.indent = 0

      // --- CURRENT BRANCH
      this.spinner.indent = 4
      this.spinner.info(`Branch: ${currentBranch}`)
      await this.cleanDist()
      await this.buildBranch(currentBranch)
      const currentBranchReport = normalizeSlugsInFileNames(await this.getSingleBranchReport())

      report = {
        currentBranchReport,
        targetBranchReport,
      }
    } catch (error_) {
      this.spinner.fail(`${error_}`)
      error(error_)
    }

    await this.destroy()
    return report
  }

  private async buildBranch(branch: string) {
    this.spinner.start(`Checkout`)
    await exec(`git reset --hard`)
    await exec(`git clean -f`)
    await exec(`git checkout ${branch}`)
    this.spinner.succeed().start(`Install`)
    await exec(this.inputParams.installScript, {maxBuffer: 20_000 * 1024})
    this.spinner.succeed().start(`Building`)
    await exec(this.inputParams.buildScript, {maxBuffer: 20_000 * 1024})
    this.spinner.succeed()
  }

  private async cleanDist() {
    this.spinner.start(`Cleaning dist`)
    ;(await this.getTargetedFiles(this.inputParams.buildFilesPatterns)).map((element) => fs.unlinkSync(element))
    this.spinner.succeed()
  }

  private async cloneRepo(gitRepository: string) {
    this.spinner.start(`Cloning ${gitRepository}`)

    const {GITHUB_TOKEN} = process.env
    // If there's a GITHUB_TOKEN env variable, use it to clone the repository
    const authenticatedGitRepositoryUrl = GITHUB_TOKEN
      ? gitRepository.replace(`https://github.com/`, `https://${GITHUB_TOKEN}@github.com/`)
      : gitRepository
    await exec(`git clone ${authenticatedGitRepositoryUrl} .`)
    this.spinner.succeed()
  }

  private async destroy() {
    if (this.inputParams.gitRepository) {
      process.chdir(this.originalCwd)
      await this.safeDeleteFolder(path.resolve(this.workDir))
    }
  }

  // From whatever the current branch is, returns a list of each files that are matched by `buildFilesPatterns`
  private async getSingleBranchReport(): Promise<IFileSizeReport> {
    this.spinner.start(`Calculating sizes of files matching: \`${this.inputParams.buildFilesPatterns}\``)
    const targetedFiles = await this.getTargetedFiles(this.inputParams.buildFilesPatterns)
    const fileSizes = (await Promise.all(
      targetedFiles.map((element) => this.safeGetSize(element)),
    )) as ReadonlyArray<number>
    const filePaths = targetedFiles.map((file) => file.replace(this.workDir, '')) as ReadonlyArray<string>
    this.spinner.succeed()
    return zipObj(filePaths, fileSizes)
  }

  private async getTargetedFiles(regex: string[]): Promise<string[]> {
    try {
      return await globby(regex.map((item) => path.resolve(item)) as ReadonlyArray<string>)
    } catch {
      return []
    }
  }

  private async init() {
    this.workDir = await fs.realpathSync(process.cwd())
    if (this.inputParams.gitRepository) {
      this.workDir = this.generateWorkDirName()
      await exec(`mkdir -p ${this.workDir}`)
      this.workDir = await fs.realpathSync(this.workDir)
      process.chdir(this.workDir)
      const {stdout} = await exec(`pwd`)
      this.spinner.info(`Working Directory: ${stdout.trim()}`)
      await this.cloneRepo(this.inputParams.gitRepository)
    }
  }

  private async safeGetSize(files: string | string[]): Promise<number> {
    try {
      // Todo: add `gzip: false` in the options, since we're only intereseted in parsed size
      return (await getSize(files, {webpack: false})).parsed
    } catch {
      return 0
    }
  }
}

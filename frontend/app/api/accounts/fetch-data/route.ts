import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { ExecOptions } from 'child_process'

const execAsync = promisify(exec) as (command: string, options?: ExecOptions) => Promise<{ stdout: string; stderr: string }>

// Path to account manager script
const BACKEND_DIR = path.resolve(process.cwd(), '..', 'backend')
const ACCOUNT_MANAGER_CLI = path.resolve(BACKEND_DIR, 'account_manager_cli.py')

// Helper function to run Python CLI command
async function runAccountManagerCommand(args: string[]): Promise<any> {
  const escapeArg = (arg: string): string => {
    if (arg.includes(' ') || arg.includes('"') || arg.includes('&') || arg.includes('|')) {
      return `"${arg.replace(/"/g, '\\"')}"`
    }
    return arg
  }
  
  const escapedArgs = args.map(escapeArg).join(' ')
  const command = `conda run -n trader-env python "${ACCOUNT_MANAGER_CLI}" ${escapedArgs}`
  
  const { stdout, stderr } = await execAsync(command, { 
    cwd: BACKEND_DIR,
    shell: true,
    maxBuffer: 10 * 1024 * 1024
  })

  if (stderr && !stderr.includes('WARNING') && !stderr.trim().includes('Pydantic')) {
    console.error('Python stderr:', stderr)
  }

  const output = stdout.trim()
  if (!output) {
    throw new Error('No output from command')
  }

  try {
    return JSON.parse(output)
  } catch (e) {
    console.error('Failed to parse JSON:', output)
    throw new Error(`Failed to parse output: ${output.substring(0, 200)}`)
  }
}

// POST /api/accounts/fetch-data - Trigger data fetching
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { account_id } = body
    
    const args = ['fetch-data']
    if (account_id) {
      args.push('--account-id', account_id)
    }
    
    const result = await runAccountManagerCommand(args)
    
    if (result.success) {
      return NextResponse.json({ 
        success: true,
        message: result.message || 'Data fetch triggered'
      })
    } else {
      return NextResponse.json(
        { error: result.error || 'Failed to trigger data fetch' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Error triggering data fetch:', error)
    return NextResponse.json(
      { error: 'Failed to trigger data fetch', details: error.message },
      { status: 500 }
    )
  }
}


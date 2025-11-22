import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { ExecOptions } from 'child_process'

const execAsync = promisify(exec) as (command: string, options?: ExecOptions) => Promise<{ stdout: string; stderr: string }>
// In Next.js, process.cwd() is the project root (frontend directory)
// So we need to go up one level to reach the backend directory
const BACKEND_DIR = path.resolve(process.cwd(), '..', 'backend')
const ACCOUNT_MANAGER_CLI = path.resolve(BACKEND_DIR, 'account_manager_cli.py')

// Helper function to run Python CLI command
async function runAccountManagerCommand(args: string[]): Promise<any> {
  // Escape arguments properly for Windows command line
  const escapeArg = (arg: string): string => {
    // If arg contains spaces or special chars, wrap in quotes and escape internal quotes
    if (arg.includes(' ') || arg.includes('"') || arg.includes('&') || arg.includes('|')) {
      return `"${arg.replace(/"/g, '\\"')}"`
    }
    return arg
  }
  
  const escapedArgs = args.map(escapeArg).join(' ')
  const command = `conda run -n trader-env python "${ACCOUNT_MANAGER_CLI}" ${escapedArgs}`
  
  const { stdout, stderr } = await execAsync(command, { 
    cwd: BACKEND_DIR,
    shell: true as any,
    maxBuffer: 10 * 1024 * 1024 // 10MB buffer
  } as ExecOptions)

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

// DELETE /api/accounts/[id] - Delete account
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const account_id = params.id

    if (!account_id) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      )
    }

    const result = await runAccountManagerCommand(['delete', account_id])
    
    if (result.success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json(
        { error: result.error || 'Account not found' },
        { status: 404 }
      )
    }
  } catch (error: any) {
    console.error('Error deleting account:', error)
    return NextResponse.json(
      { error: 'Failed to delete account', details: error.message },
      { status: 500 }
    )
  }
}

// PATCH /api/accounts/[id] - Update account
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const account_id = params.id
    const body = await request.json()

    if (!account_id) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      )
    }

    // Build update arguments
    const args = ['update', account_id]
    if (body.name !== undefined) {
      args.push('--name', body.name)
    }
    if (body.enabled !== undefined) {
      args.push('--enabled', body.enabled.toString())
    }

    if (args.length === 2) {
      return NextResponse.json(
        { error: 'No updates provided' },
        { status: 400 }
      )
    }

    const result = await runAccountManagerCommand(args)
    
    if (result.success) {
      return NextResponse.json({ account: result.account })
    } else {
      return NextResponse.json(
        { error: result.error || 'Account not found' },
        { status: 404 }
      )
    }
  } catch (error: any) {
    console.error('Error updating account:', error)
    return NextResponse.json(
      { error: 'Failed to update account', details: error.message },
      { status: 500 }
    )
  }
}


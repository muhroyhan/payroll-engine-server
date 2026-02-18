import { Test, TestingModule } from '@nestjs/testing'
import { EmployeeController } from './controllers'
import { EmployeeService } from './services'

describe('EmployeeController', () => {
  let controller: EmployeeController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmployeeController],
      providers: [EmployeeService],
    }).compile()

    controller = module.get<EmployeeController>(EmployeeController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})

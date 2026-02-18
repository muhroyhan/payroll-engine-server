import { Test, TestingModule } from '@nestjs/testing'
import { PayslipController } from './controllers'
import { PayslipService } from './services'

describe('PayslipController', () => {
  let controller: PayslipController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PayslipController],
      providers: [PayslipService],
    }).compile()

    controller = module.get<PayslipController>(PayslipController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
